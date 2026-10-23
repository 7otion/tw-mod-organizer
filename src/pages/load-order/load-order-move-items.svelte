<script lang="ts">
	import * as ContextMenu from '@/components/ui/context-menu';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import {
		LoadOrderStore,
		type LoadOrderRow,
		type SeparatorRow,
	} from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	type Props = {
		rows: readonly LoadOrderRow[];
		menu: 'dropdown' | 'context';
		onpriority: () => void;
	};

	let { rows, menu, onpriority }: Props = $props();

	const loadOrderStore = LoadOrderStore.get();

	const targets = $derived<(SeparatorRow | null)[]>([
		null,
		...loadOrderStore.outline.filter(
			(row): row is SeparatorRow => row.kind === 'separator'
		),
	]);
</script>

{#snippet label(target: SeparatorRow | null)}
	{#if target}
		<span
			class="size-2 shrink-0 rounded-full"
			style:background-color={tagColor(target.separator.background_color)}
		></span>
		{target.separator.title}
	{:else}
		{t('loadOrder.move.top')}
	{/if}
{/snippet}

{#if menu === 'dropdown'}
	<DropdownMenu.Item onSelect={onpriority}>
		{t('loadOrder.move.priority')}
	</DropdownMenu.Item>
	<DropdownMenu.Separator />
	<DropdownMenu.Label>{t('loadOrder.move.separator')}</DropdownMenu.Label>
	{#each targets as target (target?.key ?? 0)}
		<DropdownMenu.Item
			onSelect={() => loadOrderStore.moveToSeparator(rows, target)}
		>
			{@render label(target)}
		</DropdownMenu.Item>
	{/each}
{:else}
	<ContextMenu.Item onSelect={onpriority}>
		{t('loadOrder.move.priority')}
	</ContextMenu.Item>
	<ContextMenu.Separator />
	<ContextMenu.Label>{t('loadOrder.move.separator')}</ContextMenu.Label>
	{#each targets as target (target?.key ?? 0)}
		<ContextMenu.Item
			onSelect={() => loadOrderStore.moveToSeparator(rows, target)}
		>
			{@render label(target)}
		</ContextMenu.Item>
	{/each}
{/if}
