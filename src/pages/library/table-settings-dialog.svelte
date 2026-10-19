<script lang="ts">
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { RestrictToElement } from '@dnd-kit/dom/modifiers';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { DragOrder } from '@/lib/drag-order.svelte';
	import {
		LibraryColumnsStore,
		COVER_SIZES,
		type LibraryColumn,
		type CoverSize,
	} from '@/lib/store';

	import TableColumnRow from './table-column-row.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const COVER_SIZE_LABELS: Record<CoverSize, string> = {
		none: 'None',
		compact: 'Compact',
		regular: 'Regular',
		large: 'Large',
		huge: 'Huge',
	};

	const libraryColumnsStore = LibraryColumnsStore.get();

	const order = new DragOrder(
		() => libraryColumnsStore.columns,
		(column) => column.key,
		(keys: LibraryColumn[]) => libraryColumnsStore.reorder(keys)
	);

	let list = $state<HTMLUListElement | null>(null);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[460px]">
		<Dialog.Header>
			<Dialog.Title>Table · Library</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-semibold text-muted-foreground"
				>Cover size</span
			>
			<ToggleGroup.Root
				type="single"
				aria-label="Cover size"
				bind:value={
					() => libraryColumnsStore.coverSize,
					(coverSize) =>
						coverSize &&
						libraryColumnsStore.setCoverSize(coverSize as CoverSize)
				}
			>
				{#each COVER_SIZES as coverSize (coverSize)}
					<ToggleGroup.Item value={coverSize} class="h-8">
						{COVER_SIZE_LABELS[coverSize]}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-semibold text-muted-foreground"
				>Columns</span
			>
			<div class="flex flex-col gap-px">
				<ul bind:this={list} class="flex flex-col gap-px">
					<DragDropProvider
						modifiers={[
							RestrictToVerticalAxis,
							RestrictToElement.configure({
								element: () => list,
							}),
						]}
						onDragOver={(event) => order.over(event)}
						onDragEnd={(event) => order.end(event.canceled)}
					>
						{#each order.items as column, index (column.key)}
							<TableColumnRow {column} {index} />
						{/each}
					</DragDropProvider>
				</ul>
			</div>
			<p class="text-xs text-muted-foreground">
				Drag to reorder. Drag a column header's edge to set its width;
				double-click the edge to make it automatic again.
			</p>
		</div>

		<Dialog.Footer class="items-center sm:justify-between">
			<Button variant="ghost" onclick={() => libraryColumnsStore.reset()}>
				<RotateCcwIcon />
				Reset to default
			</Button>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>Done</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
