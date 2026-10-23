<script lang="ts">
	import { page } from '$app/state';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PanelTopIcon from '@lucide/svelte/icons/panel-top';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	import LinkGroupMenu from '@/components/link-group-menu.svelte';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import type { MessageKey } from '@/lib/i18n/message-key';
	import { AppStore, LoadOrderStore } from '@/lib/store';

	import ForceUpdateDialog from './force-update-dialog.svelte';
	import ImportCollectionDialog from './import-collection-dialog.svelte';
	import InstallModDialog from './install-mod-dialog.svelte';
	import WorkshopDownloadsDialog from './workshop-downloads-dialog.svelte';

	type HeaderAction = {
		labelKey: MessageKey;
		icon: LucideIcon;
		isPrimary?: boolean;
		opensDialog?: boolean;
		onclick?: () => void;
	};

	const SHELL_BUTTON = 'h-7 gap-1.5 rounded-shell px-3 text-sm font-semibold';
	const SHELL_PRIMARY = 'bg-pink-deep/70 text-bone hover:bg-pink-deep/50';
	const SHELL_SECONDARY = 'bg-raised hover:bg-active aria-expanded:bg-active';

	const appStore = AppStore.get();
	const loadOrderStore = LoadOrderStore.get();

	let isImporting = $state(false);
	let isForceUpdating = $state(false);

	const LOAD_ORDER_ACTIONS: HeaderAction[] = [
		{
			labelKey: 'header.loadOrder.addMods',
			icon: PlusIcon,
			isPrimary: true,
			onclick: () =>
				(loadOrderStore.isPicking = !loadOrderStore.isPicking),
		},
		{
			labelKey: 'header.loadOrder.separator',
			icon: PanelTopIcon,
			opensDialog: true,
			onclick: () => (loadOrderStore.isCreatingSeparator = true),
		},
	];

	const LOAD_ORDER_TAIL: HeaderAction[] = [
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
			opensDialog: true,
			onclick: () => appStore.openInstallMod(),
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

	const isLibrary = $derived(page.url.pathname.startsWith('/library'));
	const isLoadOrder = $derived(page.url.pathname.startsWith('/load-order'));
</script>

{#snippet actionButton(action: HeaderAction)}
	<Button
		variant={action.isPrimary ? 'default' : 'secondary'}
		aria-haspopup={action.opensDialog ? 'dialog' : undefined}
		class={[
			SHELL_BUTTON,
			action.isPrimary ? SHELL_PRIMARY : SHELL_SECONDARY,
		]}
		onclick={action.onclick}
	>
		<action.icon class="size-3.5" />
		{t(action.labelKey)}
	</Button>
{/snippet}

<div class="clickable-content flex items-center gap-1.5 self-center">
	{#if isLibrary}
		{#each LIBRARY_ACTIONS as action (action.labelKey)}
			{@render actionButton(action)}
		{/each}
	{:else if isLoadOrder}
		{#each LOAD_ORDER_ACTIONS as action (action.labelKey)}
			{@render actionButton(action)}
		{/each}
		<LinkGroupMenu class="{SHELL_BUTTON} {SHELL_SECONDARY}" />
		{#each LOAD_ORDER_TAIL as action (action.labelKey)}
			{@render actionButton(action)}
		{/each}
	{/if}
</div>

<InstallModDialog />
<ImportCollectionDialog bind:open={isImporting} />
<ForceUpdateDialog bind:open={isForceUpdating} />
<WorkshopDownloadsDialog />
