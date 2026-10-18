<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SearchIcon from '@lucide/svelte/icons/search';

	import { Button, buttonVariants } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import * as Popover from '@/components/ui/popover';

	import { type GameEntry, GamesStore } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import GameOption from './game-option.svelte';

	const RECENT_LIMIT = 5;

	const gamesStore = GamesStore.get();

	let isOpen = $state(false);
	let query = $state('');

	const current = $derived(gamesStore.current);
	const matches = (game: GameEntry) =>
		`${game.series} ${game.title}`
			.toLowerCase()
			.includes(query.trim().toLowerCase());
	const isListed = (game: GameEntry) =>
		game.isInstalled && game.app_id !== current?.app_id && matches(game);

	const pinned = $derived(gamesStore.pinned.filter(isListed));
	const recent = $derived(
		gamesStore.recent
			.filter((game) => isListed(game) && !game.isPinned)
			.slice(0, RECENT_LIMIT)
	);

	async function switchTo(game: GameEntry): Promise<void> {
		isOpen = false;
		if (game.app_id !== current?.app_id) await gamesStore.open(game);
	}

	function browse(): void {
		isOpen = false;
		gamesStore.isBrowsing = true;
	}

	async function close(): Promise<void> {
		isOpen = false;
		await gamesStore.close();
	}
</script>

{#snippet section(label: string, games: GameEntry[], isCurrent = false)}
	<div class="flex flex-col border-t p-1 first:border-t-0">
		<p class="px-2 pt-1.5 pb-1 text-sm font-semibold text-muted-foreground">
			{label}
		</p>
		{#each games as game (game.app_id)}
			<GameOption
				{game}
				{isCurrent}
				onopen={() => switchTo(game)}
				onpin={() => gamesStore.togglePin(game)}
			/>
		{/each}
	</div>
{/snippet}

<Popover.Root bind:open={isOpen} onOpenChange={(open) => !open && (query = '')}>
	<Popover.Trigger
		class={cn(
			buttonVariants({ variant: 'ghost' }),
			'clickable-content h-auto w-sidebar justify-start gap-3 rounded-none border-r border-line bg-panel px-0 pe-3 text-left hover:bg-hover aria-expanded:bg-hover'
		)}
	>
		<img src={current?.cover} alt="" class="h-full w-20 object-cover" />
		<span class="flex flex-1 flex-col font-engraved leading-[1.2]">
			<small
				class="text-xs font-medium tracking-[0.14em] text-gray-400 brightness-125"
			>
				{current?.series}
			</small>
			<span
				class="text-md font-semibold tracking-[0.10em] text-foreground"
			>
				{current?.title}
			</span>
		</span>
		<ChevronDownIcon class="size-3.5 text-muted-foreground" />
	</Popover.Trigger>
	<Popover.Content
		align="start"
		sideOffset={0}
		class="w-[340px] gap-0 p-0"
		role="listbox"
		aria-label="Choose a game"
	>
		<div class="border-b p-2">
			<InputGroup.Root>
				<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
				<InputGroup.Input
					type="search"
					placeholder="Filter games"
					aria-label="Filter games"
					bind:value={query}
				/>
			</InputGroup.Root>
		</div>
		<div class="flex flex-col">
			{#if current && matches(current)}
				{@render section('Current', [current], true)}
			{/if}
			{#if pinned.length}
				{@render section('Pinned', pinned)}
			{/if}
			{#if recent.length}
				{@render section('Recent', recent)}
			{/if}
		</div>
		<div class="flex flex-col gap-px border-t p-1">
			<Button variant="ghost" class="justify-start px-2" onclick={browse}>
				<LayoutGridIcon />
				All games…
			</Button>
			<Button variant="ghost" class="justify-start px-2" onclick={close}>
				<LogOutIcon />
				Close game
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
