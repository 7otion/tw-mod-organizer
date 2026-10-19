<script lang="ts">
	import SaveIcon from '@lucide/svelte/icons/save';

	import { t } from '@/lib/i18n';

	import LibrarySummary from './library-summary.svelte';
	import LoadOrderOutline from './load-order-outline.svelte';
	import ProfileList from './profile-list.svelte';
	import SidebarAction from './sidebar-action.svelte';
	import SidebarDivider from './sidebar-divider.svelte';
</script>

<ProfileList />
<SidebarDivider />
<LoadOrderOutline />
<div class="flex flex-col gap-0.5 border-t border-line py-3">
	<SidebarAction icon={SaveIcon}>
		{t('sidebar.loadOrder.rebuildFromSave')}
	</SidebarAction>
	<LibrarySummary />
</div>
