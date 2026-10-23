<script lang="ts" generics="Row, ScrollKey">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import BellIcon from '@lucide/svelte/icons/bell';

	import * as Tooltip from '@/components/ui/tooltip';

	import { t } from '@/lib/i18n';
	import { cn } from '@/lib/utils';

	import { enableBox } from './enable-box.svelte';
	import { MOD_COLUMN_SPECS, type ModSort } from './mod-columns';
	import { HEADER_INSETS, type ModTable } from './mod-table-state.svelte';

	let { table }: { table: ModTable<Row, ScrollKey> } = $props();

	const SortIcon = $derived(
		table.sort?.isDescending ? ArrowDownIcon : ArrowUpIcon
	);
	const enableAll = $derived.by(() => {
		const state = table.enableState;
		if (state === 'mixed') return 'mixed';
		return state === 'on';
	});
</script>

{#snippet sortButton(
	label: string,
	sort: ModSort,
	props: Record<string, unknown> = {}
)}
	{@const isSorted = table.sort!.key === sort}
	<button
		{...props}
		type="button"
		class={cn(
			'inline-flex cursor-pointer items-center gap-1 truncate hover:text-foreground',
			isSorted && 'text-foreground'
		)}
		onclick={() => table.sort!.sortBy(sort)}
	>
		{label}
		{#if isSorted}
			<SortIcon class="size-3.5 shrink-0" />
		{/if}
	</button>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		'grid h-8 shrink-0 grid-cols-(--table-columns) items-center gap-x-3 border-b text-sm font-semibold text-muted-foreground',
		HEADER_INSETS[table.inset]
	)}
	oncontextmenu={() => (table.isSettingsOpen = true)}
>
	{#if table.drag?.hasHandle}
		<span></span>
	{/if}
	{#if table.isNumbered}
		<span class="text-center">{t('modTable.columns.number')}</span>
	{/if}
	{#if table.enable}
		<span class="grid place-items-center">
			{#if table.enableState}
				{@render enableBox(
					enableAll,
					t('modTable.row.enableAll'),
					() => void table.toggleAllEnabled()
				)}
			{/if}
		</span>
	{/if}
	{#each table.layout.visibleColumns as column (column.key)}
		{@const spec = MOD_COLUMN_SPECS[column.key]}
		{@const sort = table.sort ? spec.sort : undefined}
		{#if column.key === 'mod'}
			<span
				class={cn(
					'flex uppercase',
					table.layout.hasCover && 'col-span-2'
				)}
			>
				{#if sort}
					{@render sortButton(t(spec.labelKey), sort)}
				{:else}
					<span class="truncate">{t(spec.labelKey)}</span>
				{/if}
			</span>
			{#if table.hasFlags}
				<Tooltip.Root>
					<Tooltip.Trigger
						aria-label={t('notices.title')}
						class="grid h-full cursor-default place-items-center text-muted-foreground outline-0"
					>
						<BellIcon class="size-3.5" />
					</Tooltip.Trigger>
					<Tooltip.Content>{t('notices.title')}</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		{:else}
			<span
				class={cn(
					'relative flex h-full min-w-0 items-center',
					spec.align === 'center' && 'justify-center',
					spec.align === 'end' && 'justify-end'
				)}
			>
				{#if sort && spec.shortLabelKey}
					{@const { labelKey, shortLabelKey } = spec}
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
				{:else if sort}
					{@render sortButton(t(spec.labelKey), sort)}
				{:else}
					<span class="truncate"
						>{t(spec.shortLabelKey ?? spec.labelKey)}</span
					>
				{/if}
				{#if !spec.width}
					<span
						aria-hidden="true"
						class="absolute top-0 -right-2 h-full w-2.5 cursor-col-resize"
						onpointerdown={(event) =>
							table.columnLayout.startResize(event, column.key)}
						ondblclick={() =>
							table.layout.setWidth(column.key, null)}
					></span>
				{/if}
			</span>
		{/if}
	{/each}
	{#if table.hasRowActions}
		<span></span>
	{/if}
</div>
