<script lang="ts">
	import DiamondIcon from '@lucide/svelte/icons/diamond';
	import FolderIcon from '@lucide/svelte/icons/folder';

	import type { ModSource } from '@/lib/models';

	type Props = {
		source: ModSource;
		size: number;
	};

	let { source, size }: Props = $props();
</script>

{#if source === 'steam'}
	<img src="/steam-logo.webp" alt="Steam" width={size} height={size} />
{:else if source === 'nexus'}
	<img src="/nexus-logo.png" alt="Nexus" width={size} height={size} />
{:else if source === 'base'}
	<DiamondIcon aria-label="Base" {size} class="text-muted-foreground" />
{:else}
	<FolderIcon aria-label="Manual" {size} class="text-muted-foreground" />
{/if}
