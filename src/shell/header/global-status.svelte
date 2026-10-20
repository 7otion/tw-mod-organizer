<script lang="ts">
	import { t } from '@/lib/i18n';
	import { LibraryScanStore, WorkshopDownloadsStore } from '@/lib/store';

	import AnimatedEllipsis from './animated-ellipsis.svelte';

	const libraryScanStore = LibraryScanStore.get();
	const downloadsStore = WorkshopDownloadsStore.get();

	const PILL_CLASSES =
		'flex h-6.5 items-center gap-2 self-center rounded-full bg-fill-1 px-3 text-sm font-semibold tabular-nums';

	const scanLabel = $derived.by(() => {
		const enrichment = libraryScanStore.enrichment;
		if (enrichment?.step === 'times') return t('header.enrich.times');
		if (enrichment)
			return t('header.enrich.progress', {
				done: enrichment.done,
				total: enrichment.total,
			});
		const progress = libraryScanStore.scanProgress;
		if (!progress?.total) return t('header.scan.starting');
		return t('header.scan.progress', {
			done: progress.done,
			total: progress.total,
		});
	});
	const hasDownloads = $derived(
		downloadsStore.total > 0 && !downloadsStore.isOpen
	);
</script>

{#if libraryScanStore.isScanning}
	<span class={PILL_CLASSES}>
		<span class="size-1.5 animate-pulse rounded-full bg-status-update"
		></span>
		{scanLabel}<AnimatedEllipsis />
	</span>
{:else if hasDownloads}
	<button
		type="button"
		class="{PILL_CLASSES} clickable-content cursor-pointer hover:bg-fill-2"
		onclick={() => (downloadsStore.isOpen = true)}
	>
		<span
			class="size-1.5 rounded-full bg-status-update"
			class:animate-pulse={downloadsStore.isActive}
		></span>
		{#if downloadsStore.isActive}
			{t(`header.downloads.progress.${downloadsStore.kind}`, {
				done: downloadsStore.done,
				total: downloadsStore.total,
			})}<AnimatedEllipsis />
		{:else}
			{t(`header.downloads.finished.${downloadsStore.kind}`, {
				done: downloadsStore.done,
				total: downloadsStore.total,
			})}
		{/if}
	</button>
{/if}
