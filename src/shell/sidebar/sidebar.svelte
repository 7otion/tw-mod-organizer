<script lang="ts">
	import { page } from '$app/state';

	import LibrarySidebar from './library-sidebar.svelte';
	import LoadOrderSidebar from './load-order-sidebar.svelte';

	const isLibrary = $derived(page.url.pathname.startsWith('/library'));
</script>

<aside
	class="flex min-h-0 w-sidebar shrink-0 flex-col border-r border-line bg-panel bg-fade-black"
>
	{#if isLibrary}
		<LibrarySidebar />
	{:else}
		<LoadOrderSidebar />
	{/if}
</aside>
