<script lang="ts">
	import { page } from '$app/state';

	import DownloadsSidebar from './downloads-sidebar.svelte';
	import GroupsSidebar from './groups-sidebar.svelte';
	import LibrarySidebar from './library-sidebar.svelte';
	import LoadOrderSidebar from './load-order-sidebar.svelte';

	const isLibrary = $derived(page.url.pathname.startsWith('/library'));
	const isGroups = $derived(page.url.pathname.startsWith('/groups'));
	const isDownloads = $derived(page.url.pathname.startsWith('/downloads'));
</script>

<aside
	class="flex min-h-0 w-sidebar shrink-0 flex-col border-r border-line bg-panel bg-fade-black"
>
	{#if isLibrary}
		<LibrarySidebar />
	{:else if isGroups}
		<GroupsSidebar />
	{:else if isDownloads}
		<DownloadsSidebar />
	{:else}
		<LoadOrderSidebar />
	{/if}
</aside>
