<script lang="ts">
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';

	import { Button } from '@/components/ui/button';

	import type { GameEntry } from '@/lib/store';

	type Props = {
		game: GameEntry;
		onsetfolder: () => void;
		onstore: () => void;
	};

	let { game, onsetfolder, onstore }: Props = $props();
</script>

<div
	class="grid min-h-15 grid-cols-[72px_minmax(0,1fr)_140px_auto] items-center gap-4 border-t px-3 py-2 first:border-t-0"
>
	<img
		src={game.cover}
		alt=""
		class="h-10 w-18 rounded-md object-cover opacity-50"
	/>
	<span class="flex flex-col leading-snug">
		<b class="font-semibold text-foreground-2">
			{game.series}: {game.title}
		</b>
		<span class="text-xs text-muted-foreground">
			Not found in your Steam libraries
		</span>
	</span>
	<span
		class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
	>
		<span class="size-1.5 rounded-full border border-muted-foreground"
		></span>
		Not installed
	</span>
	<span class="flex gap-1.5">
		<Button variant="ghost" size="sm" onclick={onsetfolder}>
			<FolderOpenIcon />
			Set game folder…
		</Button>
		<Button variant="secondary" size="sm" onclick={onstore}>
			<ExternalLinkIcon />
			Get on Steam
		</Button>
	</span>
</div>
