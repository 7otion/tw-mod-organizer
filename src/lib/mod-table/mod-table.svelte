<script lang="ts" generics="Row, ScrollKey">
	import { untrack, type Snippet } from 'svelte';

	import * as ContextMenu from '@/components/ui/context-menu';

	import { t } from '@/lib/i18n';
	import type { NoticeCategory } from '@/lib/notices/categories';
	import type { Selection } from '@/lib/selection.svelte';
	import { cn } from '@/lib/utils';

	import BulkBar from './bulk-bar.svelte';
	import FlagTooltip, { type FlagTarget } from './flag-tooltip.svelte';
	import ModRow from './mod-row.svelte';
	import ModTableHeader from './mod-table-header.svelte';
	import { ROW_INSETS, type ModTable } from './mod-table-state.svelte';
	import RenameModDialog from './rename-mod-dialog.svelte';
	import TableSettingsDialog from './table-settings-dialog.svelte';

	type Props = {
		table: ModTable<Row, ScrollKey>;
		isEmpty?: boolean;
		hasHeader?: boolean;
		hasBulkBar?: boolean;
		belowHeader?: Snippet;
		empty?: Snippet;
		noRows?: Snippet;
		rowActions?: Snippet<[Row]>;
		bulkActions?: Snippet<[Selection<number>]>;
		band?: Snippet<[Row]>;
		rowMenu?: Snippet<[readonly Row[]]>;
	};

	let {
		table,
		isEmpty = false,
		hasHeader = true,
		hasBulkBar = true,
		belowHeader,
		empty,
		noRows,
		rowActions,
		bulkActions,
		band,
		rowMenu,
	}: Props = $props();

	const FLAG_DELAY_MS = 250;

	const drag = untrack(() => table.drag);

	let flagTarget = $state.raw<FlagTarget | null>(null);
	let menuRows = $state.raw<readonly Row[]>([]);
	let flagTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => table.register());

	function pickMenuRows(event: MouseEvent): void {
		const element =
			event.target instanceof Element
				? event.target.closest<HTMLElement>('[data-row]')
				: null;
		const row = element
			? table.rowByKey(Number(element.dataset.row))
			: null;
		if (!row) {
			menuRows = [];
			return;
		}
		const selection = table.selection;
		if (!selection || !table.isRowSelectable(row)) {
			menuRows = [row];
			return;
		}
		if (!selection.has(table.keyOf(row)))
			selection.select(table.keyOf(row), event);
		menuRows = table.selectedRows();
	}

	function flagOf(target: EventTarget | null): HTMLElement | null {
		return target instanceof Element
			? target.closest<HTMLElement>('[data-flag]')
			: null;
	}

	function clearFlagTimer(): void {
		if (flagTimer) clearTimeout(flagTimer);
		flagTimer = null;
	}

	function showFlag(event: PointerEvent | FocusEvent): void {
		const flag = flagOf(event.target);
		if (!flag) return;
		const key = Number(
			flag.closest<HTMLElement>('[data-row]')?.dataset.row
		);
		const row = table.rowByKey(key);
		if (!row || !table.isModRow(row)) return;
		const mod = table.modOf(row);
		const category =
			flag.dataset.flag === 'more'
				? null
				: (flag.dataset.flag as NoticeCategory);
		clearFlagTimer();
		flagTimer = setTimeout(
			() => (flagTarget = { anchor: flag, mod, category }),
			event.type === 'focusin' ? 0 : FLAG_DELAY_MS
		);
	}

	function hideFlag(event: PointerEvent | FocusEvent): void {
		const flag = flagOf(event.target);
		if (!flag) return;
		const next = event.relatedTarget;
		if (next instanceof Node && flag.contains(next)) return;
		clearFlagTimer();
		flagTarget = null;
	}
</script>

{#snippet bandRow(row: Row, top: number, isGhost: boolean)}
	{@const key = table.keyOf(row)}
	{@const liftTop = isGhost ? null : (drag?.liftTopOf(key) ?? null)}
	<li
		data-row={isGhost ? undefined : key}
		class={cn(
			'absolute top-0 transition-[background-color,transform] duration-150 ease-out select-none',
			ROW_INSETS[table.inset],
			liftTop !== null &&
				'z-10 bg-surface-2 shadow-pop transition-[background-color]',
			liftTop === null && drag?.isLifted(key) && !isGhost && 'opacity-35',
			isGhost && 'shadow-pop'
		)}
		style:height="{table.heightOf(row)}px"
		style:transform="translateY({liftTop ?? top}px)"
	>
		{@render band?.(row)}
	</li>
{/snippet}

{#snippet list(props: Record<string, unknown>)}
	<ul
		{...props}
		class="relative"
		style:height="{table.virtualList.totalSize}px"
		onpointerdown={drag ? (event) => drag.arm(event) : undefined}
		onpointerover={table.hasFlags ? showFlag : undefined}
		onpointerout={table.hasFlags ? hideFlag : undefined}
		onfocusin={table.hasFlags ? showFlag : undefined}
		onfocusout={table.hasFlags ? hideFlag : undefined}
		oncontextmenucapture={rowMenu ? pickMenuRows : undefined}
	>
		{#each table.visibleRows as visible (table.keyOf(visible.row))}
			{#if table.isModRow(visible.row)}
				<ModRow
					{table}
					row={visible.row}
					index={visible.index}
					top={visible.top}
					{rowActions}
				/>
			{:else}
				{@render bandRow(visible.row, visible.top, false)}
			{/if}
		{/each}
	</ul>
{/snippet}

<div
	class="relative flex min-h-0 flex-1 flex-col"
	style:--table-columns={table.columnLayout.template}
>
	{#if hasHeader}
		<ModTableHeader {table} />
	{/if}
	{@render belowHeader?.()}

	{#if isEmpty}
		{@render empty?.()}
	{:else}
		<div class="min-h-0 flex-1 overflow-y-auto" bind:this={table.viewport}>
			{#if rowMenu}
				<ContextMenu.Root>
					<ContextMenu.Trigger disabled={!menuRows.length}>
						{#snippet child({ props })}
							{@render list(props)}
						{/snippet}
					</ContextMenu.Trigger>
					<ContextMenu.Content class="min-w-52">
						{@render rowMenu(menuRows)}
					</ContextMenu.Content>
				</ContextMenu.Root>
			{:else}
				{@render list({})}
			{/if}
			{#if !table.rows.length}
				{@render noRows?.()}
			{/if}
		</div>
	{/if}

	{#if hasBulkBar && table.selection?.count}
		<BulkBar selection={table.selection} bind:ref={table.bulkBar}>
			{@render bulkActions?.(table.selection)}
		</BulkBar>
	{/if}

	{#if drag?.ghost}
		{@const ghost = drag.ghost}
		<ul
			class="pointer-events-none fixed z-50"
			style:left="{drag.point.x - ghost.grabOffset.x}px"
			style:top="{drag.point.y - ghost.grabOffset.y}px"
			style:width="{ghost.width}px"
			style:height="{ghost.height}px"
		>
			{#if table.isModRow(ghost.row)}
				<ModRow
					{table}
					row={ghost.row}
					index={0}
					top={0}
					{rowActions}
					isGhost
				/>
			{:else}
				{@render bandRow(ghost.row, 0, true)}
			{/if}
			{#if ghost.count > 1}
				<span
					class="absolute top-1/2 right-10 -translate-y-1/2 rounded-full bg-foreground px-1.5 text-xs font-semibold text-background"
				>
					+{ghost.count - 1}
				</span>
			{/if}
		</ul>
	{/if}
</div>

{#if table.hasFlags}
	<FlagTooltip target={flagTarget} />
{/if}

{#if drag?.dropLine}
	{@const line = drag.dropLine}
	<div
		class="pointer-events-none fixed z-40 h-0.5 rounded-sm bg-pink shadow-[0_0_0_3px_rgba(0,0,0,0.35)] before:absolute before:-top-[3px] before:-left-1 before:size-2 before:rounded-full before:bg-pink"
		style:top="{line.top}px"
		style:left="{line.left}px"
		style:width="{line.width}px"
	>
		<span
			class="absolute -top-6 right-0 rounded-sm bg-pink px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-pink-ink"
		>
			{line.index >= table.rows.length
				? t('modTable.drop.end', {
						count: line.count,
						position: line.index + 1,
					})
				: t('modTable.drop.line', {
						count: line.count,
						position: line.index + 1,
					})}
		</span>
	</div>
{/if}

{#if hasHeader}
	<TableSettingsDialog
		bind:open={table.isSettingsOpen}
		layout={table.layout}
		title={t(table.settingsTitleKey)}
	/>
{/if}

<RenameModDialog bind:mod={table.renamingMod} />
