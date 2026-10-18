<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { open } from '@tauri-apps/plugin-dialog';
	import { openUrl } from '@tauri-apps/plugin-opener';

	import { Button } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import { ScrollArea } from '@/components/ui/scroll-area';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { type GameEntry, GamesStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	import GameCard from './game-card.svelte';
	import GameRow from './game-row.svelte';

	type Filter = 'all' | 'installed' | 'pinned';

	const gamesStore = GamesStore.get();

	const isFirstRun = $derived(gamesStore.recent.length === 0);
	const installed = $derived(
		gamesStore.list.filter((game) => game.isInstalled)
	);

	let filter = $state<Filter>('all');
	let query = $state('');
	let selectedId = $state<number | null>(
		gamesStore.isBrowsing
			? (gamesStore.current?.app_id ?? null)
			: (gamesStore.recent.find((game) => game.isInstalled)?.app_id ??
					null)
	);

	const matches = $derived(
		gamesStore.list.filter((game) =>
			`${game.series} ${game.title}`
				.toLowerCase()
				.includes(query.trim().toLowerCase())
		)
	);
	const cards = $derived(
		matches.filter(
			(game) => game.isInstalled && (filter !== 'pinned' || game.isPinned)
		)
	);
	const others = $derived(
		filter === 'all' ? matches.filter((game) => !game.isInstalled) : []
	);
	const selected = $derived(
		installed.find((game) => game.app_id === selectedId) ?? null
	);

	const counts = $derived({
		all: gamesStore.list.length,
		installed: installed.length,
		pinned: gamesStore.pinned.length,
	});

	$effect(() => {
		if (isFirstRun && !gamesStore.isBrowsing && installed.length === 1)
			void gamesStore.open(installed[0]).catch(toastError);
	});

	async function proceed(): Promise<void> {
		if (selected) await gamesStore.open(selected).catch(toastError);
	}

	async function setFolder(game: GameEntry): Promise<void> {
		const path = await open({ directory: true });
		if (!path) return;
		await gamesStore.setFolder(game, path).catch(toastError);
	}
</script>

<main class="flex min-h-0 flex-1 flex-col bg-tone-2 px-18 pt-10">
	<div class="flex items-end gap-5 border-b pb-5">
		<div class="flex flex-1 flex-col gap-1.5">
			{#if gamesStore.isBrowsing && gamesStore.current}
				<Button
					variant="ghost"
					size="sm"
					class="-ml-2 self-start"
					onclick={() => (gamesStore.isBrowsing = false)}
				>
					<ArrowLeftIcon />
					Back to {gamesStore.current.title}
				</Button>
			{/if}
			<h1 class="font-blackletter text-[50px] leading-none font-medium">
				{#if gamesStore.isBrowsing}
					Games
				{:else if isFirstRun}
					Choose your first game
				{:else}
					Choose a game
				{/if}
			</h1>
			<p class="text-md">
				TMO found {installed.length} supported
				{installed.length === 1 ? 'game' : 'games'} on this PC. You can switch
				any time from the title bar.
			</p>
		</div>
		<ToggleGroup.Root
			type="single"
			bind:value={
				() => filter, (value) => value && (filter = value as Filter)
			}
		>
			{#each ['all', 'installed', 'pinned'] as const as option (option)}
				<ToggleGroup.Item value={option} class="h-8 gap-1.5 capitalize">
					{option}
					<b
						class="font-mono text-xs font-normal text-muted-foreground"
					>
						{counts[option]}
					</b>
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
		<InputGroup.Root class="w-[260px]">
			<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
			<InputGroup.Input
				type="search"
				placeholder="Filter games"
				aria-label="Filter games"
				bind:value={query}
			/>
		</InputGroup.Root>
	</div>

	<ScrollArea class="min-h-0 flex-1">
		<div class="flex flex-col gap-7 py-7">
			<section>
				<p
					class="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground after:h-px after:flex-1 after:bg-border"
				>
					Installed <span class="font-medium">{cards.length}</span>
				</p>
				{#if cards.length}
					<div class="grid grid-cols-4 gap-5">
						{#each cards as game (game.app_id)}
							<GameCard
								{game}
								isSelected={game.app_id === selectedId}
								onselect={() => (selectedId = game.app_id)}
								oncontinue={() =>
									gamesStore.open(game).catch(toastError)}
								onpin={() =>
									gamesStore
										.togglePin(game)
										.catch(toastError)}
							/>
						{/each}
					</div>
				{:else}
					<p class="text-md text-muted-foreground">
						{filter === 'pinned'
							? 'No pinned games. Pin one from its card.'
							: 'No supported game found in your Steam libraries.'}
					</p>
				{/if}
			</section>

			{#if others.length}
				<section>
					<p
						class="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground after:h-px after:flex-1 after:bg-border"
					>
						Not installed <span class="font-medium"
							>{others.length}</span
						>
					</p>
					<div class="rounded-lg bg-card">
						{#each others as game (game.app_id)}
							<GameRow
								{game}
								onsetfolder={() => setFolder(game)}
								onstore={() =>
									openUrl(
										`https://store.steampowered.com/app/${game.app_id}/`
									).catch(toastError)}
							/>
						{/each}
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						More Total War titles appear here as TMO adds support.
					</p>
				</section>
			{/if}
		</div>
	</ScrollArea>

	<footer class="flex h-18 shrink-0 items-center justify-end gap-5 border-t">
		{#if selected}
			<span
				class="flex flex-col items-end font-engraved text-lg leading-snug"
			>
				{selected.series}: {selected.title}
			</span>
		{/if}
		<Button
			size="lg"
			class="h-10 px-7"
			variant="pink"
			disabled={!selected}
			onclick={proceed}
		>
			Continue
			<ArrowRightIcon />
		</Button>
	</footer>
</main>
