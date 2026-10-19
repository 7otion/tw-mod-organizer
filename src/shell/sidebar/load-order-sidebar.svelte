<script lang="ts">
	import SaveIcon from '@lucide/svelte/icons/save';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';

	import { t } from '@/lib/i18n';

	import LibrarySummary from './library-summary.svelte';
	import LoadOrderOutline from './load-order-outline.svelte';
	import ManageProfilesDialog from './manage-profiles-dialog.svelte';
	import ProfileList from './profile-list.svelte';
	import SidebarAction from './sidebar-action.svelte';
	import SidebarDivider from './sidebar-divider.svelte';

	let isManagingProfiles = $state(false);
</script>

<ProfileList />
<SidebarDivider />
<LoadOrderOutline />
<div class="flex flex-col gap-0.5 border-t border-line py-3">
	<SidebarAction icon={SaveIcon}>
		{t('sidebar.loadOrder.rebuildFromSave')}
	</SidebarAction>
	<SidebarAction
		icon={Settings2Icon}
		onclick={() => (isManagingProfiles = true)}
	>
		{t('sidebar.loadOrder.manageProfiles')}
	</SidebarAction>
	<LibrarySummary />
</div>

<ManageProfilesDialog bind:open={isManagingProfiles} />
