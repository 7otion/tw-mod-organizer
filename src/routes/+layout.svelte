<script lang="ts">
	import './layout.css';

	import { listen } from '@tauri-apps/api/event';

	import { Toaster } from '@/components/ui/sonner';

	import { toastError } from '@/lib/utils';

	let { children } = $props();

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

<Toaster />

{@render children()}
