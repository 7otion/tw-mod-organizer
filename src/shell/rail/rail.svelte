<script lang="ts">
	import { page } from '$app/state';
	import ComponentIcon from '@lucide/svelte/icons/component';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import TagIcon from '@lucide/svelte/icons/tag';

	import * as Tooltip from '@/components/ui/tooltip';

	import SettingsRailButton from '@/shell/settings/rail-button.svelte';
	import ManageProfilesDialog from '@/shell/sidebar/manage-profiles-dialog.svelte';
	import ManageTagsDialog from '@/shell/sidebar/manage-tags-dialog.svelte';

	import { t } from '@/lib/i18n';
	import { navRoutes } from '@/lib/nav-routes';
	import { LibraryScanStore } from '@/lib/store';

	import NoticesRailButton from './notices-rail-button.svelte';
	import RailAction from './rail-action.svelte';
	import RailButton from './rail-button.svelte';

	const ACTIVE_DOWNLOADS = 2;

	const libraryScanStore = LibraryScanStore.get();

	let isManagingTags = $state(false);
	let isManagingProfiles = $state(false);

	function isAt(path: string): boolean {
		const location = page.url.pathname;
		return path === '/'
			? location === '/'
			: location === path || location.startsWith(path + '/');
	}

	const active = $derived(navRoutes.find((route) => isAt(route.path)));
</script>

<nav
	aria-label={t('nav.sections')}
	class="flex w-rail shrink-0 flex-col items-center gap-1.5 border-r border-line bg-tone-0 py-3"
>
	<Tooltip.Provider delayDuration={1000}>
		{#each navRoutes as route (route.id)}
			<RailButton
				{route}
				active={route === active}
				badge={route.id === 'downloads' ? ACTIVE_DOWNLOADS : undefined}
			/>
		{/each}
		<div class="flex-1"></div>
		<RailAction
			icon={TagIcon}
			label={t('nav.manageTags')}
			active={isManagingTags}
			onclick={() => (isManagingTags = true)}
		/>
		<RailAction
			icon={ComponentIcon}
			label={t('nav.manageProfiles')}
			active={isManagingProfiles}
			onclick={() => (isManagingProfiles = true)}
		/>
		<RailAction
			icon={RefreshCwIcon}
			label={t('nav.rescan')}
			busy={libraryScanStore.isScanning}
			iconClass={libraryScanStore.isScanning
				? 'animate-spin text-status-lose'
				: 'text-status-ok'}
			onclick={() => libraryScanStore.scan({ full: true })}
		/>
		<NoticesRailButton />
		<SettingsRailButton />
	</Tooltip.Provider>
</nav>

<ManageTagsDialog bind:open={isManagingTags} />
<ManageProfilesDialog bind:open={isManagingProfiles} />
