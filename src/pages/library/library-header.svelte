<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';

	import { Checkbox } from '@/components/ui/checkbox';
	import * as Tooltip from '@/components/ui/tooltip';

	import { t } from '@/lib/i18n';
	import type { Selection } from '@/lib/selection.svelte';
	import {
		LibraryColumnsStore,
		LibraryFilterStore,
		type LibrarySort,
	} from '@/lib/store';
	import { cn } from '@/lib/utils';

	import type { ColumnLayout } from './column-layout.svelte';
	import { COLUMN_INFO } from './library-columns';

	type Props = {
		layout: ColumnLayout;
		selection: Selection<number>;
		onconfigure: () => void;
	};

	let { layout, selection, onconfigure }: Props = $props();

	const libraryFilterStore = LibraryFilterStore.get();
	const libraryColumnsStore = LibraryColumnsStore.get();

	const SortIcon = $derived(
		libraryFilterStore.isDescending ? ArrowDownIcon : ArrowUpIcon
	);
</script>

{#snippet sortButton(
	label: string,
	sort: LibrarySort,
	props: Record<string, unknown> = {}
)}
	{@const isSorted = libraryFilterStore.sort === sort}
	<button
		{...props}
		type="button"
		class={cn(
			'inline-flex cursor-pointer items-center gap-1 truncate hover:text-foreground',
			isSorted && 'text-foreground'
		)}
		onclick={() => libraryFilterStore.sortBy(sort)}
	>
		{label}
		{#if isSorted}
			<SortIcon class="size-3.5 shrink-0" />
		{/if}
	</button>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="mx-6 grid h-8 shrink-0 grid-cols-(--library-columns) items-center gap-x-3 border-b px-5 text-sm font-semibold text-muted-foreground"
	oncontextmenu={onconfigure}
>
	<Checkbox
		checked={selection.isAll}
		indeterminate={selection.isSome}
		aria-label={t('common.selectAll')}
		onCheckedChange={() => selection.toggleAll()}
	/>
	{#each libraryColumnsStore.visibleColumns as column (column.key)}
		{@const info = COLUMN_INFO[column.key]}
		{#if column.key === 'mod'}
			<span
				class={cn(
					'flex uppercase',
					libraryColumnsStore.hasCover && 'col-span-2'
				)}
			>
				{@render sortButton(t(info.labelKey), 'title')}
			</span>
		{:else}
			<span
				class={cn(
					'relative flex h-full min-w-0 items-center',
					info.align === 'center' && 'justify-center',
					info.align === 'end' && 'justify-end'
				)}
			>
				{#if info.sort && info.shortLabelKey}
					{@const { labelKey, shortLabelKey, sort } = info}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								{@render sortButton(
									t(shortLabelKey),
									sort,
									props
								)}
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>{t(labelKey)}</Tooltip.Content>
					</Tooltip.Root>
				{:else if info.sort}
					{@render sortButton(t(info.labelKey), info.sort)}
				{:else}
					<span class="truncate">{t(info.labelKey)}</span>
				{/if}
				{#if !info.width}
					<span
						aria-hidden="true"
						class="absolute top-0 -right-2 h-full w-2.5 cursor-col-resize"
						onpointerdown={(event) =>
							layout.startResize(event, column.key)}
						ondblclick={() =>
							libraryColumnsStore.setWidth(column.key, null)}
					></span>
				{/if}
			</span>
		{/if}
	{/each}
</div>
