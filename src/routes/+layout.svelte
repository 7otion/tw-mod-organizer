<script lang="ts">
	import '@/app.css';

	import { listen } from '@tauri-apps/api/event';

	import { Toaster } from '@/components/ui/sonner';
	import * as Tooltip from '@/components/ui/tooltip';

	import GameGate from '@/shell/game-gate.svelte';
	import Header from '@/shell/header/header.svelte';
	import WordmarkHeader from '@/shell/header/wordmark-header.svelte';
	import Rail from '@/shell/rail/rail.svelte';
	import Sidebar from '@/shell/sidebar/sidebar.svelte';
	import S7forgeSetup from '@/pages/s7forge-setup/s7forge-setup.svelte';

	import { AppStore, S7forgeStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	let { children } = $props();

	const appStore = AppStore.get();
	const s7forgeStore = S7forgeStore.get();

	$effect(() => {
		const unlisten = listen<string>('backend-panic', (event) =>
			toastError(`Backend crashed: ${event.payload}`)
		);
		return () => void unlisten.then((off) => off());
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
		{:else if !s7forgeStore.version}
			<WordmarkHeader />
			<S7forgeSetup />
		{:else}
			<GameGate>
				<Header />
				<div class="flex min-h-0 flex-1">
					<Rail />
					<Sidebar />
					<main class="flex min-w-0 flex-1 flex-col">
						{@render children()}
					</main>
				</div>
			</GameGate>
		{/if}
	</div>
</Tooltip.Provider>
