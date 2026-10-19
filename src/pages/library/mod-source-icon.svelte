<script lang="ts">
	import DiamondIcon from '@lucide/svelte/icons/diamond';
	import FolderIcon from '@lucide/svelte/icons/folder';

	import { t } from '@/lib/i18n';
	import type { ModSource } from '@/lib/models';

	type Props = {
		source: ModSource;
		size: number;
	};

	let { source, size }: Props = $props();
</script>

{#if source === 'steam'}
	<img
		src="/steam-logo.webp"
		alt={t('library.sources.steam')}
		width={size}
		height={size}
	/>
{:else if source === 'nexus'}
	<img
		src="/nexus-logo.png"
		alt={t('library.sources.nexus')}
		width={size}
		height={size}
	/>
{:else if source === 'base'}
	<DiamondIcon
		aria-label={t('library.sources.base')}
		{size}
		class="text-muted-foreground"
	/>
{:else}
	<FolderIcon
		aria-label={t('library.sources.manual')}
		{size}
		class="text-muted-foreground"
	/>
{/if}
