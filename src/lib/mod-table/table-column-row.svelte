<script lang="ts">
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';

	import { Checkbox } from '@/components/ui/checkbox';

	import { t } from '@/lib/i18n';
	import type { ColumnState, TableLayout } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import { MOD_COLUMN_SPECS, type ModColumn } from './mod-columns';

	type Props = {
		layout: TableLayout<ModColumn>;
		column: ColumnState<ModColumn>;
		index: number;
	};

	let { layout, column, index }: Props = $props();

	const sortable = createSortable({
		get id() {
			return column.key;
		},
		get index() {
			return index;
		},
	});

	const widthLabel = $derived.by(() => {
		if (!column.isVisible) return t('modTable.settings.width.hidden');
		const { width } = MOD_COLUMN_SPECS[column.key];
		if (width) return t(`modTable.settings.width.${width}`);
		return column.width
			? t('modTable.settings.width.pixels', { width: column.width })
			: t('modTable.settings.width.auto');
	});
</script>

<li
	{@attach sortable.attach}
	class={cn(
		'group grid h-row-compact grid-cols-[16px_16px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 text-md hover:bg-fill-1',
		sortable.isDragging && 'bg-surface-1'
	)}
>
	<span
		{@attach sortable.attachHandle}
		class="grid cursor-grab place-items-center text-foreground-4 group-hover:text-muted-foreground"
	>
		<GripVerticalIcon class="size-4" />
	</span>
	<Checkbox
		checked={column.isVisible}
		disabled={column.key === 'mod'}
		aria-label={t('modTable.settings.show', {
			column: t(MOD_COLUMN_SPECS[column.key].labelKey),
		})}
		onCheckedChange={(isChecked) =>
			layout.setVisible(column.key, isChecked)}
	/>
	<span class={cn(!column.isVisible && 'text-muted-foreground')}>
		{t(MOD_COLUMN_SPECS[column.key].labelKey)}
	</span>
	<span class="font-mono text-xs text-muted-foreground">{widthLabel}</span>
</li>
