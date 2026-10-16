<script lang="ts">
	import '@/app.css';

	import { listen } from '@tauri-apps/api/event';

	import { Toaster } from '@/components/ui/sonner';
	import * as Tooltip from '@/components/ui/tooltip';

	import Header from '@/shell/header/header.svelte';
	import Rail from '@/shell/rail/rail.svelte';
	import Sidebar from '@/shell/sidebar/sidebar.svelte';

	import { AppStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	let { children } = $props();

	const appStore = AppStore.get();

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
</script>

<svelte:head><title>TW Mod Organizer</title></svelte:head>

<svelte:window onunhandledrejection={onRejection} />
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
		<Header />
		<div class="flex min-h-0 flex-1">
			<Rail />
			<Sidebar />
			<main class="flex min-w-0 flex-1 flex-col">
				{@render children()}
			</main>
		</div>
	</div>
</Tooltip.Provider>
