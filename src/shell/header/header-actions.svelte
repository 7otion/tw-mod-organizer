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

	import { t } from '@/lib/i18n';
	import type { MessageKey } from '@/lib/i18n/message-key';
	import ForceUpdateDialog from '@/pages/library/force-update-dialog.svelte';
	import ImportCollectionDialog from '@/pages/library/import-collection-dialog.svelte';
	import WorkshopDownloadsDialog from '@/pages/library/workshop-downloads-dialog.svelte';

	type HeaderAction = {
		labelKey: MessageKey;
		icon: LucideIcon;
		isPrimary?: boolean;
		opensDialog?: boolean;
		onclick?: () => void;
	};

	let isImporting = $state(false);
	let isForceUpdating = $state(false);

	const LOAD_ORDER_ACTIONS: HeaderAction[] = [
		{
			labelKey: 'header.loadOrder.addMods',
			icon: PlusIcon,
			isPrimary: true,
		},
		{ labelKey: 'header.loadOrder.separator', icon: PanelTopIcon },
		{ labelKey: 'header.loadOrder.linkGroup', icon: LayersIcon },
		{
			labelKey: 'header.loadOrder.sort',
			icon: ArrowDownWideNarrowIcon,
			opensDialog: true,
		},
	];

	const LIBRARY_ACTIONS: HeaderAction[] = [
		{
			labelKey: 'header.library.installMod',
			icon: PackageIcon,
			isPrimary: true,
		},
		{
			labelKey: 'header.library.importCollection',
			icon: LayersIcon,
			opensDialog: true,
			onclick: () => (isImporting = true),
		},
		{
			labelKey: 'header.library.forceUpdate',
			icon: RefreshCwIcon,
			opensDialog: true,
			onclick: () => (isForceUpdating = true),
		},
	];

	const actions = $derived(
		page.url.pathname.startsWith('/library')
			? LIBRARY_ACTIONS
			: LOAD_ORDER_ACTIONS
	);
</script>

<div class="clickable-content flex items-center gap-1.5 self-center">
	{#each actions as action (action.labelKey)}
		<Button
			variant={action.isPrimary ? 'default' : 'secondary'}
			aria-haspopup={action.opensDialog ? 'dialog' : undefined}
			class={[
				'h-7 gap-1.5 rounded-shell px-3 text-sm font-semibold',
				action.isPrimary
					? 'bg-pink-deep/70 text-bone hover:bg-pink-deep/50'
					: 'bg-raised hover:bg-active aria-expanded:bg-active',
			]}
			onclick={action.onclick}
		>
			<action.icon class="size-3.5" />
			{t(action.labelKey)}
		</Button>
	{/each}
</div>

<ImportCollectionDialog bind:open={isImporting} />
<ForceUpdateDialog bind:open={isForceUpdating} />
<WorkshopDownloadsDialog />
