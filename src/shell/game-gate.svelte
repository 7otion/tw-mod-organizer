<script lang="ts">
	import type { Snippet } from 'svelte';

	import GameSelector from '@/pages/game-selector/game-selector.svelte';
	import WordmarkHeader from '@/shell/header/wordmark-header.svelte';

	import { GamesStore } from '@/lib/store';

	let { children }: { children: Snippet } = $props();

	const gamesStore = GamesStore.get();
</script>

{#if !gamesStore.isReady}
	<WordmarkHeader />
{:else if !gamesStore.current || gamesStore.isBrowsing}
	<WordmarkHeader />
	<GameSelector />
{:else}
	{@render children()}
{/if}
