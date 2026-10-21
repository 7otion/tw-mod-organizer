<script lang="ts">
	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { t } from '@/lib/i18n';
	import type { Group } from '@/lib/models';
	import { GroupsStore } from '@/lib/store';

	let { group = $bindable(null) }: { group: Group | null } = $props();

	const groupsStore = GroupsStore.get();

	const memberCount = $derived(group ? groupsStore.memberCount(group) : 0);
	const linked = $derived(group ? groupsStore.linkedProfiles(group) : []);

	async function remove(): Promise<void> {
		await groupsStore.delete(group!);
		group = null;
	}
</script>

<AlertDialog.Root
	open={group !== null}
	onOpenChange={(isOpen) => !isOpen && (group = null)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('groups.delete.title', { name: group?.name ?? '' })}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('groups.delete.description', { count: memberCount })}
				{#if linked.length}
					{t('groups.delete.linked', {
						count: linked.length,
						names: linked.map((profile) => profile.name).join(', '),
					})}
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				{t('groups.delete.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
