<script lang="ts" module>
	import { t } from '@/lib/i18n';
	import type { ModSource } from '@/lib/models';

	import { DIAMOND, FOLDER, icon } from './row-icons.svelte';

	export { sourceIcon };
</script>

{#snippet sourceIcon(source: ModSource, size: number)}
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
		<span
			class="text-muted-foreground"
			style:width="{size}px"
			style:height="{size}px"
		>
			{@render icon(DIAMOND, 'size-full', t('library.sources.base'))}
		</span>
	{:else}
		<span
			class="text-muted-foreground"
			style:width="{size}px"
			style:height="{size}px"
		>
			{@render icon(FOLDER, 'size-full', t('library.sources.manual'))}
		</span>
	{/if}
{/snippet}
