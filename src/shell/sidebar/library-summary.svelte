<script lang="ts">
	import { GamesStore, LibraryStore } from '@/lib/store';
	import { timeAgo } from '@/lib/utils';

	const gamesStore = GamesStore.get();
	const libraryStore = LibraryStore.get();

	const scanned = $derived.by(() => {
		const scannedAt = gamesStore.current!.row!.scanned_at;
		if (libraryStore.isScanning) return 'Scanning…';
		if (!scannedAt) return 'Not scanned yet';
		return `Scanned ${timeAgo(scannedAt)}`;
	});
</script>

<p class="flex flex-col gap-1 px-4 pt-1.5 text-sm text-muted-foreground">
	<span>
		Library holds
		<b class="font-semibold text-gem-gold">{libraryStore.list.length}</b>
		{libraryStore.list.length === 1 ? 'mod' : 'mods'}
	</span>
	<span>{scanned}</span>
</p>
