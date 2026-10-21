<script lang="ts" module>
	import { buttonVariants } from '@/components/ui/button';

	const DETAILS_BUTTON = [
		buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
		'ml-auto opacity-0 transition-opacity duration-120 group-hover:opacity-100 focus-visible:opacity-100',
	].join(' ');
</script>

<script lang="ts" generics="Row, ScrollKey">
	import type { Snippet } from 'svelte';

	import { formatDate, formatSize, problemText, t } from '@/lib/i18n';
	import { selectCellText } from '@/lib/select-cell-text';
	import { LibraryScanStore, LibraryStore } from '@/lib/store';
	import { tagTextColor } from '@/lib/tag-swatches';

	import { SOURCE_ICON_SIZES, type ModColumn } from './mod-columns';
	import { cover } from './mod-cover.svelte';
	import { sourceIcon } from './mod-source-icon.svelte';
	import type { ModTable, TableInset } from './mod-table-state.svelte';
	import {
		CIRCLE_ALERT,
		CIRCLE_ARROW_UP,
		GRIP_VERTICAL,
		LINK,
		PANEL_RIGHT_OPEN,
		PUZZLE,
		UNLINK,
		icon,
		type IconNode,
	} from './row-icons.svelte';

	type Props = {
		table: ModTable<Row, ScrollKey>;
		row: Row;
		index: number;
		top: number;
		rowActions?: Snippet<[Row]>;
		isGhost?: boolean;
	};

	type Mark = {
		icon: IconNode;
		label: string;
		class: string;
	};

	const SHOWN_TAGS = 2;
	const SHOWN_PROFILES = 2;
	const INSET_CLASSES: Record<TableInset, string> = {
		page: 'inset-x-6',
		drawer: 'inset-x-2.5',
	};

	let {
		table,
		row,
		index,
		top,
		rowActions,
		isGhost = false,
	}: Props = $props();

	const libraryStore = LibraryStore.get();
	const libraryScanStore = LibraryScanStore.get();

	const mod = $derived(table.modOf(row));
	const key = $derived(table.keyOf(row));
	const isSelected = $derived(table.selection?.has(key) ?? false);
	const isLifted = $derived(table.drag?.isLifted(key) ?? false);
	const isFlashed = $derived(table.drag?.isFlashed(key) ?? false);
	const isDisabled = $derived(table.isRowDisabled(row));

	function select(event: MouseEvent): void {
		if (!isDisabled) table.selection?.select(key, event);
	}
	const tags = $derived(libraryStore.tagsOf(mod));
	const placement = $derived(libraryStore.placementOf(mod));

	const inlineVersion = $derived(
		mod.version && !table.hasVersionColumn
			? t('modTable.row.version', { version: mod.version })
			: null
	);

	const mark = $derived.by((): Mark | null => {
		if (mod.isMissing)
			return {
				icon: UNLINK,
				label: t('modTable.row.missing', {
					problem: problemText(mod.problem!),
				}),
				class: 'text-status-missing',
			};
		if (mod.problem)
			return {
				icon: CIRCLE_ALERT,
				label: problemText(mod.problem),
				class: 'text-status-missing',
			};
		const missing = libraryStore.missingRequirementsOf(mod);
		if (missing.length) {
			const title =
				missing[0].required_title ??
				t('modDetails.dependencies.unknownTitle', {
					id: missing[0].required_ref,
				});
			return {
				icon: PUZZLE,
				label:
					missing.length > 1
						? t('modTable.row.needsMore', {
								title,
								count: missing.length - 1,
							})
						: t('modTable.row.needs', { title }),
				class: 'text-status-dep',
			};
		}
		if (mod.hasUnseenUpdate)
			return {
				icon: CIRCLE_ARROW_UP,
				label: t('modTable.row.newVersion'),
				class: 'text-status-update',
			};
		return null;
	});

	const profileNames = $derived(
		placement.profiles.map(({ profile, isEnabled }) =>
			isEnabled
				? profile.name
				: t('modTable.row.profileOff', { name: profile.name })
		)
	);
	const firstGroup = $derived(placement.groups[0] ?? null);
</script>

{#snippet cell(column: ModColumn)}
	{#if column === 'mod'}
		{@const coverSize = table.layout.coverSize}
		{#if coverSize !== 'none'}
			{@render cover(
				mod,
				coverSize,
				libraryScanStore.thumbnails.get(mod.id) ?? null,
				libraryScanStore.failedThumbnails
			)}
		{/if}
		<span class="flex min-w-0 items-center gap-2">
			<span
				data-cell
				class={[
					'truncate font-medium text-foreground',
					mod.problem !== null && 'text-muted-foreground',
				]}
			>
				{mod.displayTitle}
			</span>
			{#if inlineVersion}
				<span class="shrink-0">{inlineVersion}</span>
			{/if}
			{#if mark}
				<span
					class={[
						'inline-flex shrink-0 items-center gap-1 font-semibold',
						mark.class,
					]}
				>
					{@render icon(mark.icon, 'size-3.5')}
					{mark.label}
				</span>
			{/if}
			<button
				type="button"
				class={DETAILS_BUTTON}
				aria-label={t('modTable.row.openDetails')}
				onclick={(event) => {
					event.stopPropagation();
					table.openDetails(mod);
				}}
				ondblclick={(event) => event.stopPropagation()}
			>
				{@render icon(PANEL_RIGHT_OPEN, 'size-4')}
			</button>
		</span>
	{:else if column === 'source'}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="grid place-items-center"
			ondblclick={(event) => {
				if (mod.source !== 'steam') return;
				event.stopPropagation();
				void libraryStore.openInSteam(mod);
			}}
		>
			{@render sourceIcon(
				mod.source,
				SOURCE_ICON_SIZES[table.layout.coverSize]
			)}
		</span>
	{:else if column === 'author'}
		<span data-cell class="truncate">{mod.author_name ?? '—'}</span>
	{:else if column === 'tags'}
		<span data-cell class="flex min-w-0 gap-1.5 overflow-hidden">
			{#each tags.slice(0, SHOWN_TAGS) as tag, position (tag.id)}
				{#if position > 0}
					<span class="text-foreground-4">·</span>
				{/if}
				<span
					class="whitespace-nowrap"
					style:color={tagTextColor(tag.color)}
				>
					{tag.name}
				</span>
			{/each}
			{#if tags.length > SHOWN_TAGS}
				<span class="text-foreground-4">·</span>
				<span class="whitespace-nowrap"
					>+{tags.length - SHOWN_TAGS}</span
				>
			{/if}
		</span>
	{:else if column === 'profiles'}
		<span
			data-cell
			class="flex min-w-0 items-center gap-1.5 text-foreground-2"
		>
			{#if profileNames.length}
				<span class="truncate">
					{profileNames.slice(0, SHOWN_PROFILES).join(', ')}
				</span>
				{#if profileNames.length > SHOWN_PROFILES}
					<span class="whitespace-nowrap text-muted-foreground">
						+{profileNames.length - SHOWN_PROFILES}
					</span>
				{/if}
			{:else if firstGroup}
				<span class="inline-flex min-w-0 items-center gap-1 truncate">
					{@render icon(LINK, 'size-3.5 shrink-0')}
					{t('modTable.row.viaGroup', {
						group: firstGroup.group.name,
						count: firstGroup.profiles.length,
					})}
				</span>
			{/if}
		</span>
	{:else if column === 'size'}
		<span data-cell class="text-right font-mono">
			{mod.size_bytes === null || mod.isMissing
				? '—'
				: formatSize(mod.size_bytes)}
		</span>
	{:else if column === 'updated'}
		<span data-cell class="text-right font-mono">
			{mod.isMissing || !mod.updatedAt ? '—' : formatDate(mod.updatedAt)}
		</span>
	{:else if column === 'added'}
		<span data-cell class="text-right font-mono"
			>{mod.added_at ? formatDate(mod.added_at) : '—'}</span
		>
	{:else if column === 'version'}
		<span data-cell class="truncate text-center">{mod.version ?? '—'}</span>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<li
	data-row={isGhost ? undefined : key}
	data-disabled={isDisabled || undefined}
	class={[
		'group absolute top-0 grid grid-cols-(--table-columns) items-center gap-x-3 rounded-md text-sm text-muted-foreground transition-[background-color,transform] duration-150 select-none hover:bg-fill-1',
		INSET_CLASSES[table.inset],
		table.drag && !table.drag.hasHandle && !isDisabled && 'cursor-grab',
		isSelected && 'bg-pink-tint hover:bg-pink-tint-2',
		isFlashed && 'bg-status-ok/15',
		isLifted && !isGhost && 'opacity-35',
		isDisabled && !isGhost && 'opacity-45',
		isGhost && 'bg-surface-2 shadow-pop',
		table.layout.hasRowDivider &&
			'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border',
	]}
	style:height="{table.rowHeight}px"
	style:transform="translateY({top}px)"
	onclick={select}
	ondblclick={selectCellText}
>
	{#if table.drag?.hasHandle}
		<span
			data-handle
			class={[
				'-mx-2 grid cursor-grab place-items-center self-stretch px-2 text-foreground-4 group-hover:text-muted-foreground',
				isDisabled && 'invisible',
			]}
		>
			{@render icon(GRIP_VERTICAL, 'size-5')}
		</span>
	{/if}
	{#if table.isNumbered}
		<span class="text-center font-mono italic tabular-nums"
			>{index + 1}</span
		>
	{/if}
	{#each table.layout.visibleColumns as column (column.key)}
		{@render cell(column.key)}
	{/each}
	{#if table.hasRowActions}
		<span class="grid place-items-center">
			{@render rowActions?.(row)}
		</span>
	{/if}
</li>
