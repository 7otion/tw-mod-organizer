<script lang="ts">
	import { t, timeAgo } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { GamesStore, LibraryStore } from '@/lib/store';

	const gamesStore = GamesStore.get();
	const libraryStore = LibraryStore.get();

	const scanned = $derived.by(() => {
		const scannedAt = gamesStore.current!.row!.scanned_at;
		if (libraryStore.isScanning) return t('sidebar.summary.scanning');
		if (!scannedAt) return t('sidebar.summary.notScanned');
		return t('sidebar.summary.scanned', { time: timeAgo(scannedAt) });
	});
</script>

<p class="flex flex-col gap-1 px-4 pt-1.5 text-sm text-muted-foreground">
	<span>
		<Message
			key="sidebar.summary.holds"
			values={{ count: libraryStore.list.length }}
		>
			{#snippet value(text)}
				<b class="font-semibold text-gem-gold">{text}</b>
			{/snippet}
		</Message>
	</span>
	<span>{scanned}</span>
</p>
