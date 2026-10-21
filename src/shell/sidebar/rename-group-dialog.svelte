<script lang="ts">
	import { untrack } from 'svelte';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import type { Group } from '@/lib/models';
	import { GroupsStore } from '@/lib/store';
	import { nameError } from '@/lib/utils';

	let { group = $bindable(null) }: { group: Group | null } = $props();

	const groupsStore = GroupsStore.get();

	let name = $state('');
	let isTouched = $state(false);

	const error = $derived(
		group
			? nameError('group', name, groupsStore.isNameTaken(name, group))
			: null
	);

	$effect(() => {
		const current = group;
		untrack(() => {
			name = current?.name ?? '';
			isTouched = false;
		});
	});

	async function rename(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (!group || error) return;
		if (name.trim() !== group.name) await groupsStore.rename(group, name);
		group = null;
	}
</script>

<Dialog.Root
	open={group !== null}
	onOpenChange={(isOpen) => !isOpen && (group = null)}
>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title>{t('groups.rename.title')}</Dialog.Title>
		</Dialog.Header>
		<form id="rename-group" class="flex flex-col gap-5" onsubmit={rename}>
			<Field.Field>
				<Field.Label for="rename-group-name">
					{t('groups.nameLabel')}
				</Field.Label>
				<Input
					id="rename-group-name"
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
			<Button type="submit" form="rename-group">
				{t('groups.rename.save')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
