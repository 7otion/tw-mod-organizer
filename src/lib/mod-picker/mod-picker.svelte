<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	import Drawer from '@/components/drawer.svelte';
	import TagFilterItems from '@/components/tag-filter-items.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';
	import * as InputGroup from '@/components/ui/input-group';
	import { Toggle, toggleVariants } from '@/components/ui/toggle';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import ModCover from '@/lib/mod-table/mod-cover.svelte';
	import ModTableView from '@/lib/mod-table/mod-table.svelte';
	import { CHECK, icon } from '@/lib/mod-table/row-icons.svelte';
	import { GamesStore, LIBRARY_SOURCES, LibraryStore } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import type { ModPicker, PickerTarget } from './mod-picker-state.svelte';

	type Props = {
		picker: ModPicker;
		target: PickerTarget;
		onclose: () => void;
	};

	let { picker, target, onclose }: Props = $props();

	const gamesStore = GamesStore.get();
	const libraryStore = LibraryStore.get();

	const chipClasses = toggleVariants({ variant: 'filter', size: 'sm' });

	function onkeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') picker.table.handleKeydown(event);
	}

	function searchWorkshop(): void {
		const appId = gamesStore.current!.app_id;
		const query = encodeURIComponent(picker.search.trim());
		void openUrl(
			`https://steamcommunity.com/workshop/browse/?appid=${appId}&searchtext=${query}`
		);
	}
</script>

<Drawer label={t('modPicker.title')}>
	<div class="flex flex-col gap-4 px-4.5 pt-4.5 pb-4">
		<div class="flex items-start gap-2.5">
			<h2 class="flex-1 text-lg font-bold">{t('modPicker.title')}</h2>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={t('common.close')}
				onclick={onclose}
			>
				<XIcon />
			</Button>
		</div>
		<p class="text-sm text-muted-foreground">
			<Message key="modPicker.dragInto" values={{ name: target.name }}>
				{#snippet value(text)}
					<b class="font-semibold text-foreground">{text}</b>
				{/snippet}
			</Message>
			{#if target.kind === 'group' && target.linkedCount}
				· {t('modPicker.appliesTo', { count: target.linkedCount })}
			{/if}
		</p>
		<InputGroup.Root>
			<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
			<InputGroup.Input
				type="search"
				placeholder={t('library.search.placeholder', {
					count: libraryStore.list.length,
				})}
				aria-label={t('library.search.label')}
				bind:value={picker.search}
			/>
		</InputGroup.Root>
		<div class="flex flex-wrap gap-1.5">
			<Toggle variant="filter" size="sm" bind:pressed={picker.hideAdded}>
				{t('modPicker.hideAdded')}
			</Toggle>
			<Toggle
				variant="filter"
				size="sm"
				bind:pressed={picker.unplacedOnly}
			>
				{t('modPicker.unplaced')}
			</Toggle>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={chipClasses}
					aria-pressed={picker.sources.length > 0}
				>
					{t('modPicker.source')}
					<ChevronDownIcon class="size-3.5" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					{#each LIBRARY_SOURCES as source (source)}
						<DropdownMenu.CheckboxItem
							checked={picker.hasSource(source)}
							closeOnSelect={false}
							onCheckedChange={() => picker.toggleSource(source)}
						>
							{t(`library.sources.${source}`)}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={chipClasses}
					aria-pressed={picker.tagIds.length > 0}
				>
					{t('modPicker.tags')}
					<ChevronDownIcon class="size-3.5" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					align="start"
					class="max-h-72 overflow-y-auto"
				>
					<TagFilterItems
						isSelected={(tagId) => picker.hasTag(tagId)}
						ontoggle={(tagId) => picker.toggleTag(tagId)}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	<div
		class="flex items-center gap-2 border-b border-line px-4.5 py-1.5 text-sm text-muted-foreground"
	>
		<span>
			<Message
				key="modPicker.available"
				values={{ count: picker.available.length }}
			>
				{#snippet value(text)}
					<b class="font-semibold text-foreground-2">{text}</b>
				{/snippet}
			</Message>
			{#if picker.addedCount}
				· {t('modPicker.used', { count: picker.addedCount })}
			{/if}
		</span>
		<span class="flex-1"></span>
		<Button
			variant="ghost"
			size="sm"
			disabled={!picker.available.length}
			onclick={() => picker.selection.toggleAll()}
		>
			{picker.selection.isAll
				? t('common.clearSelection')
				: t('common.selectAll')}
		</Button>
	</div>

	<div
		role="listbox"
		aria-multiselectable="true"
		aria-label={t('modPicker.listLabel')}
		tabindex="0"
		class="flex min-h-0 flex-1 flex-col outline-none"
		{onkeydown}
	>
		<ModTableView
			table={picker.table}
			hasHeader={false}
			hasBulkBar={false}
			isEmpty={!picker.rows.length}
		>
			{#snippet empty()}
				<div
					class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
				>
					<SearchIcon class="size-6 text-muted-foreground" />
					<b class="font-semibold">
						{picker.search.trim()
							? t('modPicker.noMatch', {
									query: picker.search.trim(),
								})
							: t('modPicker.nothingLeft')}
					</b>
					<p class="text-sm text-muted-foreground">
						{t('modPicker.noMatchHint')}
					</p>
					<div class="flex gap-1.5">
						{#if picker.isFiltered}
							<Button
								variant="secondary"
								size="sm"
								onclick={() => picker.clearFilters()}
							>
								{t('modPicker.clearFilters')}
							</Button>
						{/if}
						<Button
							variant="secondary"
							size="sm"
							onclick={searchWorkshop}
						>
							<ExternalLinkIcon />
							{t('modPicker.searchWorkshop')}
						</Button>
					</div>
				</div>
			{/snippet}
			{#snippet rowActions(row)}
				{#if row.isAdded}
					<span
						class="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-foreground-2"
					>
						{@render icon(CHECK, 'size-3')}
						{t(`modPicker.added.${target.kind}`)}
					</span>
				{/if}
			{/snippet}
		</ModTableView>
	</div>

	{#if picker.selectedMods.length}
		<div class="border-t border-line bg-black/20 px-3.5 py-3">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				onpointerdown={(event) => picker.armStack(event)}
				class={cn(
					'flex cursor-grab items-center gap-3 rounded-[10px] bg-surface-2 py-2 pr-2.5 pl-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]',
					picker.isDragging && 'opacity-35'
				)}
			>
				<span class="relative h-8.5 w-15.5 shrink-0">
					{#each picker.selectedMods.slice(0, 3) as mod, index (mod.id)}
						<span
							class="absolute"
							style:left="{index * 8}px"
							style:top="{8 - index * 4}px"
						>
							<ModCover {mod} size="compact" />
						</span>
					{/each}
				</span>
				<span class="flex min-w-0 flex-1 flex-col leading-snug">
					<b class="text-sm font-semibold">
						{t('modPicker.selected', {
							count: picker.selectedMods.length,
						})}
					</b>
					<span class="text-xs text-muted-foreground">
						{picker.isDragging
							? t(`modPicker.dropInto.${target.kind}`)
							: t('modPicker.dragStack')}
					</span>
				</span>
				<GripVerticalIcon class="size-4 text-pink" />
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={t('common.clearSelection')}
					onclick={() => picker.selection.clear()}
				>
					<XIcon />
				</Button>
			</div>
		</div>
	{/if}
</Drawer>
