<script lang="ts">
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';

	import { Checkbox } from '@/components/ui/checkbox';

	import { LibraryColumnsStore, type LibraryColumnState } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import { COLUMN_INFO } from './library-columns';

	type Props = {
		column: LibraryColumnState;
		index: number;
	};

	let { column, index }: Props = $props();

	const libraryColumnsStore = LibraryColumnsStore.get();

	const sortable = createSortable({
		get id() {
			return column.key;
		},
		get index() {
			return index;
		},
	});

	const widthLabel = $derived.by(() => {
		if (!column.isVisible) return 'hidden';
		const { width } = COLUMN_INFO[column.key];
		if (width) return width;
		return column.width ? `${column.width} px` : 'auto';
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
		aria-label="Show {COLUMN_INFO[column.key].label}"
		onCheckedChange={(isChecked) =>
			libraryColumnsStore.setVisible(column.key, isChecked)}
	/>
	<span class={cn(!column.isVisible && 'text-muted-foreground')}>
		{COLUMN_INFO[column.key].label}
	</span>
	<span class="font-mono text-xs text-muted-foreground">{widthLabel}</span>
</li>
