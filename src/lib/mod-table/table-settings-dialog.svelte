<script lang="ts">
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { RestrictToElement } from '@dnd-kit/dom/modifiers';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import { Switch } from '@/components/ui/switch';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { DragOrder } from '@/lib/drag-order.svelte';
	import { t } from '@/lib/i18n';
	import type { TableLayout } from '@/lib/store';

	import { COVER_SIZES, type CoverSize, type ModColumn } from './mod-columns';
	import TableColumnRow from './table-column-row.svelte';

	type Props = {
		open: boolean;
		layout: TableLayout<ModColumn>;
		title: string;
	};

	let { open = $bindable(false), layout, title }: Props = $props();

	const order = new DragOrder(
		() => layout.columns,
		(column) => column.key,
		(keys: ModColumn[]) => layout.reorder(keys)
	);

	let list = $state<HTMLUListElement | null>(null);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[460px]">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-semibold">
				{t('modTable.settings.coverSize')}
			</span>
			<ToggleGroup.Root
				type="single"
				aria-label={t('modTable.settings.coverSize')}
				bind:value={
					() => layout.coverSize,
					(coverSize) =>
						coverSize && layout.setCoverSize(coverSize as CoverSize)
				}
			>
				{#each COVER_SIZES as coverSize (coverSize)}
					<ToggleGroup.Item value={coverSize} class="h-8">
						{t(`coverSizes.${coverSize}`)}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>

		<div class="flex items-center justify-between gap-3">
			<span class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold">
					{t('modTable.settings.rowDivider')}
				</span>
				<span class="text-sm text-muted-foreground">
					{t('modTable.settings.rowDividerHint')}
				</span>
			</span>
			<Switch
				aria-label={t('modTable.settings.rowDivider')}
				bind:checked={
					() => layout.hasRowDivider,
					(hasRowDivider) => void layout.setRowDivider(hasRowDivider)
				}
			/>
		</div>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-semibold">
				{t('modTable.settings.columns')}
			</span>
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
							<TableColumnRow {layout} {column} {index} />
						{/each}
					</DragDropProvider>
				</ul>
			</div>
		</div>

		<Dialog.Footer class="items-center sm:justify-between">
			<Button variant="ghost" onclick={() => layout.reset()}>
				<RotateCcwIcon />
				{t('modTable.settings.reset')}
			</Button>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>{t('common.done')}</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
