<script lang="ts">
	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';
	import * as RadioGroup from '@/components/ui/radio-group';
	import * as Select from '@/components/ui/select';

	import { GamesStore, ProfilesStore } from '@/lib/store';
	import { nameError } from '@/lib/utils';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const gamesStore = GamesStore.get();
	const profilesStore = ProfilesStore.get();

	let name = $state('');
	let startFrom = $state<'empty' | 'copy'>('empty');
	let copyOfId = $state<string>();
	let makeActive = $state(true);
	let isTouched = $state(false);

	const copyOf = $derived(
		profilesStore.list.find((profile) => String(profile.id) === copyOfId) ??
			profilesStore.active
	);
	const error = $derived(
		nameError('profile', name, profilesStore.isNameTaken(name))
	);

	function reset(): void {
		name = '';
		startFrom = 'empty';
		copyOfId = undefined;
		makeActive = true;
		isTouched = false;
	}

	async function create(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (error) return;
		await profilesStore.create(
			name,
			startFrom === 'copy' ? copyOf : null,
			makeActive
		);
		open = false;
		reset();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && reset()}>
	<Dialog.Content class="sm:max-w-[440px]">
		<Dialog.Header>
			<Dialog.Title>New profile</Dialog.Title>
			<Dialog.Description>
				{gamesStore.current?.series}: {gamesStore.current?.title}
			</Dialog.Description>
		</Dialog.Header>

		<form id="new-profile" class="flex flex-col gap-5" onsubmit={create}>
			<Field.Field>
				<Field.Label for="profile-name">Name</Field.Label>
				<Input
					id="profile-name"
					bind:value={name}
					aria-invalid={isTouched && error !== null}
					oninput={() => (isTouched = true)}
				/>
				{#if isTouched && error}
					<Field.Error>{error}</Field.Error>
				{/if}
			</Field.Field>

			<Field.Set>
				<Field.Legend variant="label">Start from</Field.Legend>
				<RadioGroup.Root bind:value={startFrom} class="gap-2">
					<Field.Label for="start-empty">
						<Field.Field orientation="horizontal">
							<RadioGroup.Item value="empty" id="start-empty" />
							<Field.Content>
								<Field.Title>Empty</Field.Title>
								<Field.Description>
									Add mods from the library afterwards.
								</Field.Description>
							</Field.Content>
						</Field.Field>
					</Field.Label>
					<Field.Label for="start-copy">
						<Field.Field orientation="horizontal">
							<RadioGroup.Item value="copy" id="start-copy" />
							<Field.Content>
								<Field.Title
									>Copy of another profile</Field.Title
								>
								<Field.Description>
									Same mods, order, separators and group
									links.
								</Field.Description>
							</Field.Content>
						</Field.Field>
					</Field.Label>
				</RadioGroup.Root>
				{#if startFrom === 'copy'}
					<Select.Root
						type="single"
						bind:value={
							() => String(copyOf?.id ?? ''),
							(value) => (copyOfId = value)
						}
					>
						<Select.Trigger class="w-full">
							{copyOf?.name ?? 'Choose a profile'}
						</Select.Trigger>
						<Select.Content>
							{#each profilesStore.list as profile (profile.id)}
								<Select.Item value={String(profile.id)}>
									{profile.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</Field.Set>

			<Field.Field orientation="horizontal">
				<Checkbox id="make-active" bind:checked={makeActive} />
				<Field.Label for="make-active"
					>Make it the active profile</Field.Label
				>
			</Field.Field>
		</form>

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost">Cancel</Button>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="new-profile">Create profile</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
