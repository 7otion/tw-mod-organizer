<script lang="ts" generics="Row, ScrollKey">
	import type { Snippet } from 'svelte';

	import { ScrollArea } from '@/components/ui/scroll-area';

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
		belowHeader?: Snippet;
		empty?: Snippet;
		noRows?: Snippet;
		bulkActions?: Snippet<[Selection<number>]>;
	};

	let {
		table,
		isEmpty = false,
		belowHeader,
		empty,
		noRows,
		bulkActions,
	}: Props = $props();
</script>

<div
	class="relative flex min-h-0 flex-1 flex-col"
	style:--table-columns={table.columnLayout.template}
>
	<ModTableHeader {table} />
	{@render belowHeader?.()}

	{#if isEmpty}
		{@render empty?.()}
	{:else}
		<ScrollArea class="min-h-0 flex-1" bind:viewportRef={table.viewport}>
			<ul class="relative" style:height="{table.virtualList.totalSize}px">
				{#each table.visibleRows as visible (table.keyOf(visible.row))}
					<ModRow {table} row={visible.row} top={visible.top} />
				{/each}
			</ul>
			{#if !table.rows.length}
				{@render noRows?.()}
			{/if}
		</ScrollArea>
	{/if}

	{#if table.selection?.count}
		<BulkBar selection={table.selection} bind:ref={table.bulkBar}>
			{@render bulkActions?.(table.selection)}
		</BulkBar>
	{/if}
</div>

<TableSettingsDialog
	bind:open={table.isSettingsOpen}
	layout={table.layout}
	title={t(table.settingsTitleKey)}
/>
