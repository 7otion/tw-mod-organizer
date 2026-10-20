<script lang="ts">
	import Columns3CogIcon from '@lucide/svelte/icons/columns-3-cog';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import PackageIcon from '@lucide/svelte/icons/package';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { tick, untrack } from 'svelte';

	import { Button } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import { Kbd } from '@/components/ui/kbd';
	import { ScrollArea } from '@/components/ui/scroll-area';
	import * as Select from '@/components/ui/select';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import type { Profile } from '@/lib/models';
	import { ScrollMemory } from '@/lib/scroll-memory.svelte';
	import { Selection } from '@/lib/selection.svelte';
	import { VirtualList } from '@/lib/virtual-list.svelte';
	import {
		AppStore,
		GamesStore,
		LibraryColumnsStore,
		LibraryFilterStore,
		LibraryScanStore,
		LibraryStore,
		ProfilesStore,
		type LibraryScope,
	} from '@/lib/store';
	import { formatSize, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { cn } from '@/lib/utils';

	import { ColumnLayout } from './column-layout.svelte';
	import LibraryBulkBar from './library-bulk-bar.svelte';
	import { DIVIDER_GAP, ROW_HEIGHTS } from './library-columns';
	import LibraryHeader from './library-header.svelte';
	import LibraryRow from './library-row.svelte';
	import TableSettingsDialog from './table-settings-dialog.svelte';
	import ModDetailsPanel from '@/pages/mod-details/mod-details-panel.svelte';

	type ProfileScope = Exclude<LibraryScope, 'all'>;

	const PROFILE_SCOPES: ProfileScope[] = ['has', 'lacks'];

	const LIST_PADDING = 4;

	const appStore = AppStore.get();
	const gamesStore = GamesStore.get();
	const libraryStore = LibraryStore.get();
	const libraryScanStore = LibraryScanStore.get();
	const libraryFilterStore = LibraryFilterStore.get();
	const libraryColumnsStore = LibraryColumnsStore.get();
	const profilesStore = ProfilesStore.get();

	const layout = new ColumnLayout();

	const selection = new Selection(() =>
		libraryFilterStore.visibleMods.map((mod) => mod.id)
	);

	let listViewport = $state<HTMLElement | null>(null);
	let bulkBar = $state<HTMLElement | null>(null);

	const bulkBarInset = $derived(
		bulkBar ? bulkBar.offsetParent!.clientHeight - bulkBar.offsetTop : 0
	);

	const virtualList = new VirtualList({
		count: () => libraryFilterStore.visibleMods.length,
		scrollElement: () => listViewport,
		itemSize: () =>
			ROW_HEIGHTS[libraryColumnsStore.coverSize] +
			(libraryColumnsStore.hasRowDivider ? DIVIDER_GAP : 0),
		itemKey: (index) => libraryFilterStore.visibleMods[index]?.id ?? index,
		sizeKey: () =>
			`${libraryColumnsStore.coverSize}:${libraryColumnsStore.hasRowDivider}`,
		paddingStart: LIST_PADDING,
		paddingEnd: LIST_PADDING,
		endInset: () => bulkBarInset,
		onScroll: (offset) => scrollMemory.remember(offset),
	});

	const scrollMemory = new ScrollMemory({
		list: virtualList,
		viewport: () => listViewport,
		key: () => gamesStore.current?.app_id ?? null,
		saved: () => libraryColumnsStore.savedScrollOffset,
		hasRows: () => libraryFilterStore.visibleMods.length > 0,
		isFiltered: () => libraryFilterStore.isFiltered,
		save: (appId, offset) =>
			void libraryColumnsStore.setScrollOffset(appId, offset),
	});

	const visibleRows = $derived(
		virtualList.items.flatMap((item) => {
			const mod = libraryFilterStore.visibleMods[item.index];
			return mod ? [{ mod, top: item.start }] : [];
		})
	);

	let searchInput = $state<HTMLInputElement | null>(null);
	let isTableOpen = $state(false);

	const modCount = $derived(libraryStore.list.length);
	const totalSize = $derived(
		libraryStore.list.reduce((sum, mod) => sum + (mod.size_bytes ?? 0), 0)
	);
	let detailsModId = $state<number | null>(null);

	const detailsMod = $derived(
		libraryStore.list.find((mod) => mod.id === detailsModId) ?? null
	);

	$effect(() => {
		const only = selection.only;
		if (only === null) return;
		untrack(() => {
			if (detailsModId !== null) detailsModId = only;
		});
	});

	function onkeydown(event: KeyboardEvent): void {
		if (event.ctrlKey && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			searchInput?.focus();
		} else if (event.key === 'Escape' && !event.defaultPrevented) {
			if (detailsMod) detailsModId = null;
			else selection.clear();
		} else if (
			(event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
			!event.defaultPrevented &&
			!isTyping(event.target)
		) {
			event.preventDefault();
			selection.step(
				event.key === 'ArrowDown' ? 1 : -1,
				event.shiftKey || event.ctrlKey
			);
			revealCursor();
		}
	}

	function isTyping(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement)
		);
	}

	function revealCursor(): void {
		const index = libraryFilterStore.visibleMods.findIndex(
			(mod) => mod.id === selection.cursor
		);
		if (index < 0) return;
		void tick().then(() => virtualList.scrollToIndex(index));
	}

	function openWorkshop(): void {
		void openUrl(
			`https://steamcommunity.com/app/${gamesStore.current!.app_id}/workshop/`
		);
	}
</script>

{#snippet profileDot(profile: Profile)}
	<span
		class={cn(
			'size-2 shrink-0 rounded-full',
			profile === profilesStore.active
				? 'bg-pink'
				: 'shadow-[inset_0_0_0_1.5px_var(--text-4)]'
		)}
	></span>
{/snippet}

<svelte:window {onkeydown} />

<div
	class="relative flex min-h-0 flex-1 flex-col"
	style:--library-columns={layout.template}
>
	<div class="flex items-center gap-6 px-9 pt-7 pb-5">
		<h1
			class="font-blackletter text-title leading-none font-medium [text-box:trim-both_cap_alphabetic]"
		>
			{t('library.title')}
		</h1>
		<p
			class="flex items-center gap-4 text-md font-medium text-muted-foreground"
		>
			<span>
				<Message key="library.stats.mods" values={{ count: modCount }}>
					{#snippet value(text)}
						<b class="font-bold text-foreground-2">{text}</b>
					{/snippet}
				</Message>
			</span>
			<b class="font-bold text-foreground-2">{formatSize(totalSize)}</b>
			<span>
				<Message
					key="library.stats.unused"
					values={{ count: libraryStore.unusedCount }}
				>
					{#snippet value(text)}
						<b class="font-bold text-foreground-2">{text}</b>
					{/snippet}
				</Message>
			</span>
		</p>
		<InputGroup.Root class="ml-4 flex-1">
			<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
			<InputGroup.Input
				type="search"
				placeholder={t('library.search.placeholder', {
					count: modCount,
				})}
				aria-label={t('library.search.label')}
				bind:ref={searchInput}
				bind:value={
					() => libraryFilterStore.search,
					(search) => libraryFilterStore.setSearch(search)
				}
			/>
			<InputGroup.Addon align="inline-end"
				><Kbd>{t('shortcuts.ctrl', { key: 'F' })}</Kbd
				></InputGroup.Addon
			>
		</InputGroup.Root>
	</div>

	<div class="flex items-center gap-2 px-9 pb-5">
		<Select.Root
			type="single"
			bind:value={
				() => String(libraryFilterStore.scopeProfile?.id ?? ''),
				(id) => {
					const profile = profilesStore.list.find(
						(profile) => String(profile.id) === id
					);
					if (profile) void libraryFilterStore.pickProfile(profile);
				}
			}
		>
			<Select.Trigger
				size="sm"
				aria-label={t('library.filter.profile')}
				class="min-w-48 font-semibold"
			>
				{#if libraryFilterStore.scopeProfile}
					{@render profileDot(libraryFilterStore.scopeProfile)}
				{/if}
				<span class="flex-1 truncate text-left">
					{libraryFilterStore.scopeProfile?.name}
				</span>
			</Select.Trigger>
			<Select.Content align="start">
				{#each profilesStore.list as profile (profile.id)}
					<Select.Item
						value={String(profile.id)}
						label={profile.name}
					>
						{@render profileDot(profile)}
						<span class="flex-1">{profile.name}</span>
						<span class="font-mono text-xs text-muted-foreground">
							{libraryFilterStore.profileCounts[profile.id] ?? 0}
						</span>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<ToggleGroup.Root
			type="single"
			variant="filter"
			size="lg"
			spacing={1}
			aria-label={t('library.filter.scope')}
			bind:value={
				() =>
					libraryFilterStore.scope === 'all'
						? ''
						: libraryFilterStore.scope,
				(scope) =>
					void libraryFilterStore.setScope(
						scope ? (scope as ProfileScope) : 'all'
					)
			}
		>
			{#each PROFILE_SCOPES as scope (scope)}
				<ToggleGroup.Item value={scope}>
					{t(`library.filter.scopes.${scope}`)}
					<b
						class="font-mono text-xs font-normal text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground/60"
					>
						{libraryFilterStore.scopeCounts[scope]}
					</b>
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
		<span class="flex-1"></span>
		<Button
			variant="outline"
			aria-haspopup="dialog"
			onclick={() => (isTableOpen = true)}
		>
			<Columns3CogIcon />
			{t('library.tableButton')}
		</Button>
	</div>

	<LibraryHeader
		{layout}
		{selection}
		onconfigure={() => (isTableOpen = true)}
	/>
	<div
		class={cn(
			'mx-6 h-px',
			libraryScanStore.isScanning && 'animate-pulse bg-status-update'
		)}
	></div>

	{#if modCount}
		<ScrollArea class="min-h-0 flex-1" bind:viewportRef={listViewport}>
			<ul class="relative" style:height="{virtualList.totalSize}px">
				{#each visibleRows as row (row.mod.id)}
					<LibraryRow
						mod={row.mod}
						top={row.top}
						{selection}
						onopendetails={(opened) => (detailsModId = opened.id)}
					/>
				{/each}
			</ul>
			{#if !libraryFilterStore.visibleMods.length}
				<p class="px-11 py-6 text-md text-muted-foreground">
					{t('library.noMatch')}
				</p>
			{/if}
		</ScrollArea>
	{:else}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-4 pb-16"
		>
			<span
				class="relative grid size-18 place-items-center rounded-full bg-fill-1"
			>
				{#if libraryScanStore.isScanning}
					<span
						class="absolute size-4 animate-ping rounded-full bg-pink/50"
					></span>
				{/if}
				<span class="relative size-2 rounded-full bg-pink"></span>
			</span>
			<p class="text-lg font-semibold">
				{libraryScanStore.isScanning
					? t('library.empty.scanning')
					: t('library.empty.title')}
			</p>
			<div class="flex gap-2">
				<Button onclick={() => appStore.openInstallMod()}>
					<PackageIcon />
					{t('library.empty.install')}
				</Button>
				<Button variant="secondary" onclick={openWorkshop}>
					{t('library.empty.workshop')}
					<ExternalLinkIcon />
				</Button>
			</div>
		</div>
	{/if}

	{#if selection.count}
		<LibraryBulkBar {selection} bind:ref={bulkBar} />
	{/if}

	{#if detailsMod}
		<ModDetailsPanel
			mod={detailsMod}
			context="library"
			onopen={(opened) => (detailsModId = opened.id)}
			onclose={() => (detailsModId = null)}
		/>
	{/if}
</div>

<TableSettingsDialog bind:open={isTableOpen} />
