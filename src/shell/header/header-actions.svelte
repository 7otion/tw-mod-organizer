<script lang="ts">
	import { page } from '$app/state';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PanelTopIcon from '@lucide/svelte/icons/panel-top';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	import { Button } from '@/components/ui/button';

	type HeaderAction = {
		label: string;
		icon: LucideIcon;
		isPrimary?: boolean;
		opensDialog?: boolean;
	};

	const LOAD_ORDER_ACTIONS: HeaderAction[] = [
		{ label: 'Add mods', icon: PlusIcon, isPrimary: true },
		{ label: 'Separator', icon: PanelTopIcon },
		{ label: 'Link group', icon: LayersIcon },
		{ label: 'Sort', icon: ArrowDownWideNarrowIcon, opensDialog: true },
	];

	const LIBRARY_ACTIONS: HeaderAction[] = [
		{ label: 'Install mod', icon: PackageIcon, isPrimary: true },
		{ label: 'Import collection', icon: LayersIcon },
		{ label: 'Force update', icon: RefreshCwIcon },
	];

	const actions = $derived(
		page.url.pathname.startsWith('/library')
			? LIBRARY_ACTIONS
			: LOAD_ORDER_ACTIONS
	);
</script>

<div class="clickable-content flex items-center gap-1.5 self-center">
	{#each actions as action (action.label)}
		<Button
			variant={action.isPrimary ? 'default' : 'secondary'}
			aria-haspopup={action.opensDialog ? 'dialog' : undefined}
			class={[
				'h-7 gap-1.5 rounded-shell px-3 text-sm font-semibold',
				action.isPrimary
					? 'bg-pink-deep/70 text-bone hover:bg-pink-deep/50'
					: 'bg-raised hover:bg-active aria-expanded:bg-active',
			]}
		>
			<action.icon class="size-3.5" />
			{action.label}
		</Button>
	{/each}
</div>
