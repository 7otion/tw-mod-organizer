<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	import { t } from '@/lib/i18n';
	import type { Group } from '@/lib/models';
	import { GroupsStore } from '@/lib/store';

	import DeleteGroupDialog from './delete-group-dialog.svelte';
	import GroupItem from './group-item.svelte';
	import NewGroupDialog from './new-group-dialog.svelte';
	import SidebarCount from './sidebar-count.svelte';
	import SidebarDivider from './sidebar-divider.svelte';
	import SidebarHeadingAction from './sidebar-heading-action.svelte';
	import SidebarHeading from './sidebar-heading.svelte';
	import SidebarItem from './sidebar-item.svelte';

	const groupsStore = GroupsStore.get();

	let isCreating = $state(false);
	let deleting = $state<Group | null>(null);

	const selected = $derived(groupsStore.selected);
	const linked = $derived(
		selected ? groupsStore.linkedProfiles(selected) : []
	);
</script>

<div class="flex min-h-0 flex-1 flex-col pt-4 pb-1.5">
	<SidebarHeading title={t('sidebar.groups.title')}>
		<SidebarHeadingAction
			tooltip={t('sidebar.groups.newTooltip')}
			onclick={() => (isCreating = true)}
		>
			<PlusIcon class="size-3.5" />
			{t('common.new')}
		</SidebarHeadingAction>
	</SidebarHeading>
	<div class="min-h-0 flex-1 overflow-y-auto">
		<ul class="flex flex-col gap-px">
			{#each groupsStore.list as group (group.id)}
				<GroupItem {group} ondelete={() => (deleting = group)} />
			{/each}
		</ul>
	</div>
</div>
{#if selected}
	<SidebarDivider />
	<div class="flex flex-col pt-4 pb-1.5">
		<SidebarHeading title={t('sidebar.linkedIn.title')}>
			<SidebarCount value={linked.length} />
		</SidebarHeading>
		{#if linked.length}
			<ul class="flex flex-col gap-px">
				{#each linked as profile (profile.id)}
					<SidebarItem>
						<span
							class="size-[7px] shrink-0 rotate-45 border border-muted-foreground"
						></span>
						<span class="min-w-0 flex-1 truncate"
							>{profile.name}</span
						>
					</SidebarItem>
				{/each}
			</ul>
		{:else}
			<p class="px-4 pb-2 text-sm leading-snug text-muted-foreground">
				{t('groups.linkedNone')}
			</p>
		{/if}
	</div>
{/if}
<p class="px-4 pt-3 pb-4 text-sm leading-snug text-muted-foreground">
	{t('sidebar.groups.hint')}
</p>

<NewGroupDialog bind:open={isCreating} />
<DeleteGroupDialog bind:group={deleting} />
