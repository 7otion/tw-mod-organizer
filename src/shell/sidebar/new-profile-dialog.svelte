<script lang="ts">
	import NameDialog from '@/components/name-dialog.svelte';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as Field from '@/components/ui/field';
	import * as RadioGroup from '@/components/ui/radio-group';
	import * as Select from '@/components/ui/select';

	import { t } from '@/lib/i18n';
	import { GamesStore, ProfilesStore } from '@/lib/store';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const gamesStore = GamesStore.get();
	const profilesStore = ProfilesStore.get();

	let startFrom = $state<'empty' | 'copy'>('empty');
	let copyOfId = $state<string>();
	let makeActive = $state(true);

	const copyOf = $derived(
		profilesStore.list.find((profile) => String(profile.id) === copyOfId) ??
			profilesStore.active
	);

	function reset(): void {
		startFrom = 'empty';
		copyOfId = undefined;
		makeActive = true;
	}

	async function create(name: string): Promise<void> {
		await profilesStore.create(
			name,
			startFrom === 'copy' ? copyOf : null,
			makeActive
		);
	}
</script>

<NameDialog
	bind:open
	id="new-profile"
	kind="profile"
	title={t('profiles.new.title')}
	description="{gamesStore.current!.series}: {gamesStore.current!.title}"
	nameLabel={t('profiles.new.name')}
	submitLabel={t('profiles.new.create')}
	isTaken={(name) => profilesStore.isNameTaken(name)}
	oncreate={create}
	onreset={reset}
>
	<Field.Set>
		<Field.Legend variant="label"
			>{t('profiles.new.startFrom')}</Field.Legend
		>
		<RadioGroup.Root bind:value={startFrom} class="gap-2">
			<Field.Label for="start-empty">
				<Field.Field orientation="horizontal">
					<RadioGroup.Item value="empty" id="start-empty" />
					<Field.Content>
						<Field.Title>{t('profiles.new.empty')}</Field.Title>
						<Field.Description>
							{t('profiles.new.emptyDescription')}
						</Field.Description>
					</Field.Content>
				</Field.Field>
			</Field.Label>
			<Field.Label for="start-copy">
				<Field.Field orientation="horizontal">
					<RadioGroup.Item value="copy" id="start-copy" />
					<Field.Content>
						<Field.Title>{t('profiles.new.copy')}</Field.Title>
						<Field.Description>
							{t('profiles.new.copyDescription')}
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
					{copyOf?.name ?? t('profiles.new.chooseProfile')}
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
		<Field.Label for="make-active">
			{t('profiles.new.makeActive')}
		</Field.Label>
	</Field.Field>
</NameDialog>
