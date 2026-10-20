<script lang="ts">
	import { t } from '@/lib/i18n';
	import { LibraryStore } from '@/lib/store';

	import AnimatedEllipsis from './animated-ellipsis.svelte';

	const libraryStore = LibraryStore.get();

	const label = $derived.by(() => {
		const enrichment = libraryStore.enrichment;
		if (enrichment?.step === 'times') return t('header.enrich.times');
		if (enrichment)
			return t('header.enrich.progress', {
				done: enrichment.done,
				total: enrichment.total,
			});
		const progress = libraryStore.scanProgress;
		if (!progress?.total) return t('header.scan.starting');
		return t('header.scan.progress', {
			done: progress.done,
			total: progress.total,
		});
	});
</script>

{#if libraryStore.isScanning}
	<span
		class="flex h-6.5 items-center gap-2 self-center rounded-full bg-fill-1 px-3 text-sm font-semibold tabular-nums"
	>
		<span class="size-1.5 animate-pulse rounded-full bg-status-update"
		></span>
		{label}<AnimatedEllipsis />
	</span>
{/if}
