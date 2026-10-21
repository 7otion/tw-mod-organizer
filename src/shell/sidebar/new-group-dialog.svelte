<script lang="ts">
	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { GamesStore, GroupsStore } from '@/lib/store';
	import { nameError } from '@/lib/utils';

	type Props = {
		open: boolean;
		mods?: readonly Mod[];
		oncreated?: () => void;
	};

	let { open = $bindable(false), mods = [], oncreated }: Props = $props();

	const gamesStore = GamesStore.get();
	const groupsStore = GroupsStore.get();

	let name = $state('');
	let isTouched = $state(false);

	const error = $derived(
		nameError('group', name, groupsStore.isNameTaken(name))
	);

	function reset(): void {
		name = '';
		isTouched = false;
	}

	async function create(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (error) return;
		await groupsStore.create(name, mods);
		open = false;
		reset();
		oncreated?.();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && reset()}>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title>{t('groups.new.title')}</Dialog.Title>
			<Dialog.Description>
				{#if mods.length}
					{t('groups.new.withMods', { count: mods.length })}
				{:else}
					{gamesStore.current!.series}: {gamesStore.current!.title}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form id="new-group" class="flex flex-col gap-5" onsubmit={create}>
			<Field.Field>
				<Field.Label for="group-name"
					>{t('groups.new.name')}</Field.Label
				>
				<Input
					id="group-name"
					bind:value={name}
					aria-invalid={isTouched && error !== null}
					oninput={() => (isTouched = true)}
				/>
				{#if isTouched && error}
					<Field.Error>{t(error)}</Field.Error>
				{/if}
			</Field.Field>
		</form>

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost"
						>{t('common.cancel')}</Button
					>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="new-group">
				{t('groups.new.create')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
