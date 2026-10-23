<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import Columns3CogIcon from '@lucide/svelte/icons/columns-3-cog';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';

	import LinkGroupMenu from '@/components/link-group-menu.svelte';
	import ModDetailsPanel from '@/components/mod-details/mod-details-panel.svelte';
	import NoticeStrip from '@/components/notices/notice-strip.svelte';
	import TagFilterItems from '@/components/tag-filter-items.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';
	import * as InputGroup from '@/components/ui/input-group';
	import { Kbd } from '@/components/ui/kbd';
	import { toggleVariants } from '@/components/ui/toggle';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { ModPicker } from '@/lib/mod-picker/mod-picker-state.svelte';
	import ModPickerPanel from '@/lib/mod-picker/mod-picker.svelte';
	import { ModTable } from '@/lib/mod-table/mod-table-state.svelte';
	import ModTableView from '@/lib/mod-table/mod-table.svelte';
	import type { Mod, Separator, Tag } from '@/lib/models';
	import {
		GroupsStore,
		LibraryStore,
		LoadOrderStore,
		TableLayoutStore,
		TagsStore,
		type LoadOrderRow,
		type ModRow,
	} from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	import LoadOrderBand from './load-order-band.svelte';
	import LoadOrderBulkActions from './load-order-bulk-actions.svelte';
	import { LOAD_ORDER_LAYOUT } from './load-order-layout';
	import LoadOrderRowMenu from './load-order-row-menu.svelte';
	import MoveToPriorityDialog from './move-to-priority-dialog.svelte';
	import SeparatorDialog from './separator-dialog.svelte';

	type EnabledFilter = 'all' | 'on' | 'off';

	const ENABLED_FILTERS: EnabledFilter[] = ['all', 'on', 'off'];
	const BAND_HEIGHT = 36;

	const groupsStore = GroupsStore.get();
	const libraryStore = LibraryStore.get();
	const loadOrderStore = LoadOrderStore.get();
	const tableLayoutStore = TableLayoutStore.get();
	const tagsStore = TagsStore.get();

	const layout = tableLayoutStore.layoutOf(LOAD_ORDER_LAYOUT);
	const chipClasses = toggleVariants({ variant: 'filter', size: 'lg' });

	let search = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let enabledFilter = $state<EnabledFilter>('all');
	let editingSeparator = $state<Separator | null>(null);
	let movingRows = $state<readonly LoadOrderRow[] | null>(null);
	const tagIds = new SvelteSet<number>();

	const query = $derived(search.trim().toLowerCase());
	const isFiltered = $derived(
		query !== '' || enabledFilter !== 'all' || tagIds.size > 0
	);
	const rows = $derived.by((): LoadOrderRow[] =>
		isFiltered
			? loadOrderStore.modRows.filter(matches)
			: loadOrderStore.rows
	);
	const modCount = $derived(loadOrderStore.modRows.length);
	const filterCounts = $derived.by((): Record<EnabledFilter, number> => {
		const on = loadOrderStore.enabledCount;
		return { all: modCount, on, off: modCount - on };
	});
	const quickTags = $derived(
		tagsStore.list
			.map((tag) => ({ tag, mods: taggedMods(tag) }))
			.filter(({ mods }) => mods.length)
	);
	const quickGroups = $derived(
		loadOrderStore.unlinkedGroups.filter(
			(group) => groupsStore.memberCount(group) > 0
		)
	);

	const picker = new ModPicker({
		excludeIds: () => loadOrderStore.modIds,
		openDetails: (mod) => table.openDetails(mod),
	});

	const table = new ModTable<LoadOrderRow, number>({
		layout,
		settingsTitleKey: 'loadOrder.table.title',
		rows: () => rows,
		keyOf: (row) => row.key,
		modOf: (row) => (row as ModRow).mod,
		isModRow: (row) => row.kind === 'mod',
		heightOf: (row) => (row.kind === 'mod' ? null : BAND_HEIGHT),
		numberOf: (row) => (row as ModRow).number,
		classOf: (row) =>
			row.kind === 'mod' && row.member
				? [
						'rounded-none bg-fill-1/50',
						row.isLastMember && 'rounded-b-md',
					]
				: null,
		isSelectable: true,
		isNumbered: true,
		enable: {
			isEnabled: (row) => loadOrderStore.enableStateOf(row),
			setEnabled: (rows, isEnabled) =>
				loadOrderStore.setEnabled(rows, isEnabled),
			rows: () => (isFiltered ? rows : loadOrderStore.enableRows),
		},
		drag: {
			reorder: (keys) => loadOrderStore.reorder(keys),
			unitOf: (key) => loadOrderStore.unitOf(key),
			canReorder: () => !isFiltered,
			accepts: () => !isFiltered,
			insert: (payload, index) => insertFromPicker(payload.keys, index),
		},
		reveal: (modId) => loadOrderStore.revealMod(modId),
		scrollMemory: {
			key: () => loadOrderStore.profile?.id ?? null,
			saved: () => {
				const profile = loadOrderStore.profile;
				return profile ? layout.scrollOffsetOf(profile.id) : null;
			},
			isFiltered: () => isFiltered,
			save: (profileId, offset) =>
				void layout.setScrollOffset(profileId, offset),
		},
	});

	$effect(() => {
		loadOrderStore.table = table;
		return () => {
			if (loadOrderStore.table === table) loadOrderStore.table = null;
		};
	});

	function matches(row: ModRow): boolean {
		if (enabledFilter === 'on' && !row.isEnabled) return false;
		if (enabledFilter === 'off' && row.isEnabled) return false;
		if (
			tagIds.size &&
			!libraryStore.tagsOf(row.mod).some((tag) => tagIds.has(tag.id))
		)
			return false;
		return !query || libraryStore.searchTextOf(row.mod).includes(query);
	}

	function taggedMods(tag: Tag): Mod[] {
		const present = loadOrderStore.slotsByModId;
		return libraryStore.list.filter(
			(mod) =>
				!mod.isMissing &&
				!(mod.id in present) &&
				libraryStore.tagsOf(mod).includes(tag)
		);
	}

	async function insertFromPicker(
		keys: readonly number[],
		index: number
	): Promise<readonly number[]> {
		return loadOrderStore.insertMods(picker.modsFor(keys), index);
	}

	function toggleTag(tagId: number): void {
		if (!tagIds.delete(tagId)) tagIds.add(tagId);
	}

	function onkeydown(event: KeyboardEvent): void {
		table.handlePageKeydown(event, {
			searchInput,
			picker,
			isPicking: () => loadOrderStore.isPicking,
			closePicker: () => (loadOrderStore.isPicking = false),
			onDelete: () => void loadOrderStore.remove(table.selectedRows()),
		});
	}
</script>

{#snippet bold(text: string)}
	<b class="font-bold text-foreground-2">{text}</b>
{/snippet}

{#snippet quickRow(
	label: string,
	count: number,
	action: string,
	onclick: () => void,
	swatch: string,
	isGroup: boolean
)}
	<li
		class="flex items-center gap-2 rounded-md bg-fill-1 py-1.5 pr-1.5 pl-3 text-sm"
	>
		{#if isGroup}
			<LayersIcon class="size-3.5 shrink-0" style="color: {swatch}" />
		{:else}
			<span
				class="size-2 shrink-0 rounded-full"
				style:background-color={swatch}
			></span>
		{/if}
		<span class="min-w-0 flex-1 truncate">{label}</span>
		<span class="font-mono text-xs text-muted-foreground">{count}</span>
		<Button variant="secondary" size="xs" {onclick}>{action}</Button>
	</li>
{/snippet}

<svelte:window {onkeydown} />

{#if loadOrderStore.profile}
	{@const profile = loadOrderStore.profile}
	<div class="relative flex min-h-0 flex-1 flex-col">
		<div class="flex items-center gap-6 px-9 pt-7 pb-5">
			<h1
				class="font-blackletter text-title leading-none font-medium [text-box:trim-both_cap_alphabetic]"
			>
				{profile.name}
			</h1>
			<p
				class="flex items-center gap-4 text-md font-medium text-muted-foreground"
			>
				<span>
					<Message
						key="loadOrder.stats.entries"
						values={{ count: modCount }}
					>
						{#snippet value(text)}
							{@render bold(text)}
						{/snippet}
					</Message>
				</span>
				<span>
					<Message
						key="loadOrder.stats.enabled"
						values={{ count: loadOrderStore.enabledCount }}
					>
						{#snippet value(text)}
							{@render bold(text)}
						{/snippet}
					</Message>
				</span>
			</p>
			<InputGroup.Root class="ml-4 flex-1">
				<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
				<InputGroup.Input
					type="search"
					placeholder={t('loadOrder.search.placeholder', {
						count: modCount,
					})}
					aria-label={t('loadOrder.search.label')}
					bind:ref={searchInput}
					bind:value={search}
				/>
				<InputGroup.Addon align="inline-end"
					><Kbd>{t('shortcuts.ctrl', { key: 'F' })}</Kbd
					></InputGroup.Addon
				>
			</InputGroup.Root>
		</div>

		<div class="flex items-center gap-2 px-9 pb-5">
			<ToggleGroup.Root
				type="single"
				variant="filter"
				size="lg"
				spacing={1}
				aria-label={t('loadOrder.filter.label')}
				bind:value={
					() => enabledFilter,
					(value) =>
						(enabledFilter = (value as EnabledFilter) || 'all')
				}
			>
				{#each ENABLED_FILTERS as filter (filter)}
					<ToggleGroup.Item value={filter}>
						{t(`common.${filter}`)}
						<b
							class="font-mono text-xs font-normal text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground/60"
						>
							{filterCounts[filter]}
						</b>
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={chipClasses}
					aria-pressed={tagIds.size > 0}
				>
					{t('loadOrder.tags')}
					<ChevronDownIcon class="size-3.5" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					align="start"
					class="max-h-72 min-w-44 overflow-y-auto"
				>
					<TagFilterItems
						isSelected={(tagId) => tagIds.has(tagId)}
						ontoggle={toggleTag}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<span class="flex-1"></span>
			<NoticeStrip />
			<Button
				variant="outline"
				aria-haspopup="dialog"
				onclick={() => (table.isSettingsOpen = true)}
			>
				<Columns3CogIcon />
				{t('modTable.settingsButton')}
			</Button>
		</div>

		<ModTableView
			{table}
			isEmpty={!loadOrderStore.entries.length &&
				!loadOrderStore.isPicking}
		>
			{#snippet empty()}
				<div
					class="flex flex-1 flex-col items-center justify-center gap-4 pb-16"
				>
					<span
						class="grid size-18 place-items-center rounded-full bg-fill-1"
					>
						<ListOrderedIcon class="size-6 text-muted-foreground" />
					</span>
					<p class="text-xl font-semibold">
						{t('loadOrder.empty.title')}
					</p>
					<p class="max-w-md text-center">
						{t('loadOrder.empty.description', {
							count: libraryStore.list.length,
						})}
					</p>
					<div class="flex gap-2">
						<Button
							onclick={() => (loadOrderStore.isPicking = true)}
						>
							<PlusIcon />
							{t('loadOrder.empty.addMods')}
						</Button>
						<LinkGroupMenu />
					</div>
					{#if quickTags.length || quickGroups.length}
						<p
							class="mt-4 text-2xs font-bold tracking-[0.07em] text-foreground-4 uppercase"
						>
							{t('loadOrder.empty.quickStart')}
						</p>
						<ul class="flex w-full max-w-md flex-col gap-1">
							{#each quickTags as { tag, mods } (tag.id)}
								{@render quickRow(
									t('loadOrder.empty.tagged', {
										name: tag.name,
									}),
									mods.length,
									t('loadOrder.empty.add'),
									() =>
										void loadOrderStore.insertMods(mods, 0),
									tagColor(tag.color),
									false
								)}
							{/each}
							{#each quickGroups as group (group.id)}
								{@render quickRow(
									t('loadOrder.empty.group', {
										name: group.name,
									}),
									groupsStore.memberCount(group),
									t('loadOrder.empty.link'),
									() => void loadOrderStore.linkGroup(group),
									tagColor(group.color),
									true
								)}
							{/each}
						</ul>
					{/if}
					<p class="text-sm text-muted-foreground">
						{t('loadOrder.empty.dragHint')}
					</p>
				</div>
			{/snippet}
			{#snippet noRows()}
				<p class="px-11 py-6 text-md text-muted-foreground">
					{isFiltered
						? t('loadOrder.noMatch')
						: t('loadOrder.dropHere')}
				</p>
			{/snippet}
			{#snippet band(row)}
				{#if row.kind !== 'mod'}
					<LoadOrderBand
						{row}
						onedit={(separator) => (editingSeparator = separator)}
					/>
				{/if}
			{/snippet}
			{#snippet rowMenu(rows)}
				<LoadOrderRowMenu
					{rows}
					onrename={(mod) => (table.renamingMod = mod)}
					ondetails={(mod) => table.openDetails(mod)}
					onpriority={(rows) => (movingRows = rows)}
				/>
			{/snippet}
			{#snippet bulkActions()}
				<LoadOrderBulkActions
					{table}
					onpriority={(rows) => (movingRows = rows)}
				/>
			{/snippet}
		</ModTableView>

		{#if loadOrderStore.isPicking}
			<ModPickerPanel
				{picker}
				target={{ kind: 'profile', name: profile.name }}
				onclose={() => (loadOrderStore.isPicking = false)}
			/>
		{/if}

		{#if table.detailsMod}
			<ModDetailsPanel
				mod={table.detailsMod}
				context="load-order"
				onopen={(opened) => table.openDetails(opened)}
				onclose={() => table.closeDetails()}
			/>
		{/if}
	</div>
{/if}

<MoveToPriorityDialog bind:rows={movingRows} />
<SeparatorDialog bind:open={loadOrderStore.isCreatingSeparator} />
<SeparatorDialog
	bind:open={
		() => editingSeparator !== null,
		(isOpen) => {
			if (!isOpen) editingSeparator = null;
		}
	}
	separator={editingSeparator}
/>
