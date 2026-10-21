<script lang="ts">
	import ModDetailsPanel from '@/components/mod-details/mod-details-panel.svelte';
	import NoticesDrawer from '@/components/notices/notices-drawer.svelte';

	import { NoticesStore } from '@/lib/store';

	const noticesStore = NoticesStore.get();
</script>

{#if noticesStore.detailsMod}
	<ModDetailsPanel
		mod={noticesStore.detailsMod}
		context="library"
		onopen={(mod) => noticesStore.openDetails(mod)}
		onclose={() => noticesStore.close()}
		onback={() => noticesStore.closeDetails()}
	/>
{:else if noticesStore.isOpen}
	<NoticesDrawer />
{/if}
