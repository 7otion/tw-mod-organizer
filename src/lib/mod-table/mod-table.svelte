<script lang="ts" generics="Row, ScrollKey">
	import { untrack, type Snippet } from 'svelte';

	import { t } from '@/lib/i18n';
	import type { Selection } from '@/lib/selection.svelte';

	import BulkBar from './bulk-bar.svelte';
	import ModRow from './mod-row.svelte';
	import ModTableHeader from './mod-table-header.svelte';
	import type { ModTable } from './mod-table-state.svelte';
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
	}: Props = $props();

	const drag = untrack(() => table.drag);
</script>

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
			<ul
				class="relative"
				style:height="{table.virtualList.totalSize}px"
				onpointerdown={drag ? (event) => drag.arm(event) : undefined}
			>
				{#each table.visibleRows as visible (table.keyOf(visible.row))}
					<ModRow
						{table}
						row={visible.row}
						index={visible.index}
						top={visible.top}
						{rowActions}
					/>
				{/each}
			</ul>
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
		{@const at = ghost.settle ?? {
			x: ghost.lockedX ?? drag.point.x - ghost.grabOffset.x,
			y: drag.point.y - ghost.grabOffset.y,
		}}
		<ul
			class={[
				'pointer-events-none fixed z-50',
				ghost.settle && 'transition-[left,top] duration-150 ease-out',
			]}
			style:left="{at.x}px"
			style:top="{at.y}px"
			style:width="{ghost.width}px"
			style:height="{ghost.height}px"
		>
			<ModRow
				{table}
				row={ghost.row}
				index={ghost.index}
				top={0}
				{rowActions}
				isGhost
			/>
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
