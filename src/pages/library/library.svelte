<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import Columns3CogIcon from '@lucide/svelte/icons/columns-3-cog';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import PackageIcon from '@lucide/svelte/icons/package';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { tick, untrack } from 'svelte';

	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as InputGroup from '@/components/ui/input-group';
	import { Kbd } from '@/components/ui/kbd';
	import { ScrollArea } from '@/components/ui/scroll-area';
	import * as Select from '@/components/ui/select';
	import * as ToggleGroup from '@/components/ui/toggle-group';
	import * as Tooltip from '@/components/ui/tooltip';

	import type { Profile } from '@/lib/models';
	import { ScrollMemory } from '@/lib/scroll-memory.svelte';
	import { Selection } from '@/lib/selection.svelte';
	import { VirtualList } from '@/lib/virtual-list.svelte';
	import {
		GamesStore,
		LibraryColumnsStore,
		LibraryFilterStore,
		LibraryStore,
		ProfilesStore,
		type LibraryColumn,
		type LibraryColumnState,
		type LibraryScope,
		type LibrarySort,
	} from '@/lib/store';
	import { formatSize, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { cn } from '@/lib/utils';

	import LibraryBulkBar from './library-bulk-bar.svelte';
	import {
		COLUMN_INFO,
		DIVIDER_GAP,
		ROW_HEIGHTS,
		SOURCE_ICON_SIZES,
	} from './library-columns';
	import LibraryRow from './library-row.svelte';
	import TableSettingsDialog from './table-settings-dialog.svelte';
	import ModDetailsPanel from '@/pages/mod-details/mod-details-panel.svelte';

	type ProfileScope = Exclude<LibraryScope, 'all'>;

	const PROFILE_SCOPES: ProfileScope[] = ['has', 'lacks'];

	type Resizing = {
		key: LibraryColumn;
		width: number;
	};

	const MIN_COLUMN_WIDTH = 40;
	const LIST_PADDING = 4;

	const gamesStore = GamesStore.get();
	const libraryStore = LibraryStore.get();
	const libraryFilterStore = LibraryFilterStore.get();
	const libraryColumnsStore = LibraryColumnsStore.get();
	const profilesStore = ProfilesStore.get();

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
	let resizing = $state.raw<Resizing | null>(null);

	const modCount = $derived(libraryStore.list.length);
	const totalSize = $derived(
		libraryStore.list.reduce((sum, mod) => sum + (mod.size_bytes ?? 0), 0)
	);
	const defaultWidths = $derived.by((): Record<LibraryColumn, string> => {
		const mods = libraryFilterStore.visibleMods;
		const hasTags = mods.some((mod) => libraryStore.tagsOf(mod).length);
		const hasProfiles = mods.some((mod) => !libraryStore.isUnused(mod));
		return {
			author: '120px',
			tags: hasTags ? '170px' : '2.5rem',
			source: `${SOURCE_ICON_SIZES[libraryColumnsStore.coverSize]}px`,
			mod: 'minmax(0,1fr)',
			profiles: hasProfiles ? '196px' : '5rem',
			size: '64px',
			updated: '80px',
			added: '72px',
			version: '64px',
		};
	});
	const coverWidth = $derived(
		`var(--thumb-${libraryColumnsStore.coverSize})`
	);
	const columns = $derived(
		[
			'16px',
			...libraryColumnsStore.visibleColumns.flatMap((column) =>
				column.key === 'mod' && libraryColumnsStore.hasCover
					? [coverWidth, widthOf(column)]
					: [widthOf(column)]
			),
		].join(' ')
	);
	let detailsModId = $state<number | null>(null);

	const detailsMod = $derived(
		libraryStore.list.find((mod) => mod.id === detailsModId) ?? null
	);

	const SortIcon = $derived(
		libraryFilterStore.isDescending ? ArrowDownIcon : ArrowUpIcon
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

	function widthOf(column: LibraryColumnState): string {
		if (COLUMN_INFO[column.key].width) return defaultWidths[column.key];
		if (resizing?.key === column.key) return `${resizing.width}px`;
		return column.width ? `${column.width}px` : defaultWidths[column.key];
	}

	function startResize(event: PointerEvent, key: LibraryColumn): void {
		event.preventDefault();
		const cell = (event.currentTarget as HTMLElement).parentElement!;
		const startX = event.clientX;
		const startWidth = cell.getBoundingClientRect().width;
		resizing = { key, width: Math.round(startWidth) };
		const move = (moved: PointerEvent) => {
			resizing = {
				key,
				width: Math.max(
					MIN_COLUMN_WIDTH,
					Math.round(startWidth + moved.clientX - startX)
				),
			};
		};
		const stop = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', stop);
			const done = resizing!;
			void libraryColumnsStore
				.setWidth(done.key, done.width)
				.finally(() => (resizing = null));
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', stop);
	}

	function openWorkshop(): void {
		void openUrl(
			`https://steamcommunity.com/app/${gamesStore.current!.app_id}/workshop/`
		);
	}
</script>

{#snippet sortButton(
	label: string,
	sort: LibrarySort,
	props: Record<string, unknown> = {}
)}
	{@const isSorted = libraryFilterStore.sort === sort}
	<button
		{...props}
		type="button"
		class={cn(
			'inline-flex cursor-pointer items-center gap-1 truncate hover:text-foreground',
			isSorted && 'text-foreground'
		)}
		onclick={() => libraryFilterStore.sortBy(sort)}
	>
		{label}
		{#if isSorted}
			<SortIcon class="size-3.5 shrink-0" />
		{/if}
	</button>
{/snippet}

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
	style:--library-columns={columns}
>
	<div class="flex items-center gap-6 px-9 pt-7 pb-5">
		<h1 class="font-blackletter text-title font-medium">
			{t('library.title')}
		</h1>
		<p
			class="flex items-center gap-4 pt-1.5 text-md font-medium text-muted-foreground"
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

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="mx-6 grid h-8 shrink-0 grid-cols-(--library-columns) items-center gap-x-3 border-b px-5 text-sm font-semibold text-muted-foreground"
		oncontextmenu={() => (isTableOpen = true)}
	>
		<Checkbox
			checked={selection.isAll}
			indeterminate={selection.isSome}
			aria-label={t('common.selectAll')}
			onCheckedChange={() => selection.toggleAll()}
		/>
		{#each libraryColumnsStore.visibleColumns as column (column.key)}
			{@const info = COLUMN_INFO[column.key]}
			{#if column.key === 'mod'}
				<span
					class={cn(
						'flex uppercase',
						libraryColumnsStore.hasCover && 'col-span-2'
					)}
				>
					{@render sortButton(t(info.labelKey), 'title')}
				</span>
			{:else}
				<span
					class={cn(
						'relative flex h-full min-w-0 items-center',
						info.align === 'center' && 'justify-center',
						info.align === 'end' && 'justify-end'
					)}
				>
					{#if info.sort && info.shortLabelKey}
						{@const { labelKey, shortLabelKey, sort } = info}
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									{@render sortButton(
										t(shortLabelKey),
										sort,
										props
									)}
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>{t(labelKey)}</Tooltip.Content>
						</Tooltip.Root>
					{:else if info.sort}
						{@render sortButton(t(info.labelKey), info.sort)}
					{:else}
						<span class="truncate">{t(info.labelKey)}</span>
					{/if}
					{#if !info.width}
						<span
							aria-hidden="true"
							class="absolute top-0 -right-2 h-full w-2.5 cursor-col-resize"
							onpointerdown={(event) =>
								startResize(event, column.key)}
							ondblclick={() =>
								libraryColumnsStore.setWidth(column.key, null)}
						></span>
					{/if}
				</span>
			{/if}
		{/each}
	</div>
	<div
		class={cn(
			'mx-6 h-px',
			libraryStore.isScanning && 'animate-pulse bg-status-update'
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
				class="grid size-18 place-items-center rounded-full bg-fill-1"
			>
				<span class="size-2 rounded-full bg-pink"></span>
			</span>
			<p class="text-lg font-semibold">
				{libraryStore.isScanning
					? t('library.empty.scanning')
					: t('library.empty.title')}
			</p>
			<div class="flex gap-2">
				<Button>
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
