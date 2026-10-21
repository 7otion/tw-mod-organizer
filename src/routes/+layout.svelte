<script lang="ts">
	import '@/app.css';

	import { listen } from '@tauri-apps/api/event';
	import { toast } from 'svelte-sonner';

	import { Toaster } from '@/components/ui/sonner';
	import * as Tooltip from '@/components/ui/tooltip';

	import GameGate from '@/shell/game-gate.svelte';
	import Header from '@/shell/header/header.svelte';
	import WordmarkHeader from '@/shell/header/wordmark-header.svelte';
	import NoticesSlot from '@/shell/notices-slot.svelte';
	import Rail from '@/shell/rail/rail.svelte';
	import Sidebar from '@/shell/sidebar/sidebar.svelte';

	import S7forgeSetup from '@/pages/s7forge-setup/s7forge-setup.svelte';

	import { t } from '@/lib/i18n';
	import { AppStore, S7forgeStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	let { children } = $props();

	const appStore = AppStore.get();
	const s7forgeStore = S7forgeStore.get();

	$effect(() => {
		const unlisten = listen<string>('backend-panic', (event) =>
			toastError(t('app.backendCrashed', { error: event.payload }))
		);
		return () => void unlisten.then((off) => off());
	});

	$effect(() => {
		if (!s7forgeStore.hasUpdate) return;
		toast.info(
			t('app.s7forge.available', {
				version: s7forgeStore.latestVersion ?? '',
			}),
			{
				description: t('app.s7forge.current', {
					version: s7forgeStore.version ?? '',
				}),
				action: {
					label: t('app.s7forge.update'),
					onClick: () =>
						toast.promise(s7forgeStore.install(), {
							loading: t('app.s7forge.updating'),
							success: t('app.s7forge.updated'),
							error: (error) => String(error),
						}),
				},
			}
		);
	});

	function onRejection(event: PromiseRejectionEvent): void {
		event.preventDefault();
		toastError(event.reason);
	}

	function blockTabFocus(event: KeyboardEvent): void {
		if (event.key !== 'Tab') return;
		event.preventDefault();
		event.stopPropagation();
	}
</script>

<svelte:head><title>TW Mod Organizer</title></svelte:head>

<svelte:window
	onunhandledrejection={onRejection}
	onkeydowncapture={blockTabFocus}
/>
<svelte:document oncontextmenu={(event) => event.preventDefault()} />

<Tooltip.Provider>
	<Toaster />
	<div
		data-slot="app-shell"
		class={[
			'flex h-screen w-screen flex-col overflow-hidden',
			!appStore.isMaximized && 'rounded-window',
		]}
	>
		{#if !s7forgeStore.isChecked}
			<WordmarkHeader />
		{:else if !s7forgeStore.isInstalled}
			<WordmarkHeader />
			<S7forgeSetup />
		{:else}
			<GameGate>
				<Header />
				<div class="flex min-h-0 flex-1">
					<Rail />
					<Sidebar />
					<main class="relative flex min-w-0 flex-1 flex-col">
						{@render children()}
						<NoticesSlot />
					</main>
				</div>
			</GameGate>
		{/if}
	</div>
</Tooltip.Provider>
