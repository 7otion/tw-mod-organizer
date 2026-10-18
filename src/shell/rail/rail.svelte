<script lang="ts">
	import { page } from '$app/state';

	import * as Tooltip from '@/components/ui/tooltip';

	import { navRoutes } from '@/lib/nav-routes';
	import SettingsRailButton from '@/shell/settings/rail-button.svelte';

	import RailButton from './rail-button.svelte';

	const ACTIVE_DOWNLOADS = 2;

	function isAt(path: string): boolean {
		const location = page.url.pathname;
		return path === '/'
			? location === '/'
			: location === path || location.startsWith(path + '/');
	}

	const active = $derived(navRoutes.find((route) => isAt(route.path)));
</script>

<nav
	aria-label="Sections"
	class="flex w-rail shrink-0 flex-col items-center gap-1.5 border-r border-line bg-tone-0 py-3"
>
	<Tooltip.Provider delayDuration={1000}>
		{#each navRoutes as route (route.label)}
			<RailButton
				{route}
				active={route === active}
				badge={route.label === 'Downloads'
					? ACTIVE_DOWNLOADS
					: undefined}
			/>
		{/each}
		<div class="flex-1"></div>
		<SettingsRailButton />
	</Tooltip.Provider>
</nav>
