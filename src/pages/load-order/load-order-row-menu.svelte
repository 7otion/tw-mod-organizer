<script lang="ts">
	import ModContextMenuItems from '@/components/mod-context-menu-items.svelte';
	import TagChecklistItems from '@/components/tag-checklist-items.svelte';
	import * as ContextMenu from '@/components/ui/context-menu';

	import LoadOrderMoveItems from './load-order-move-items.svelte';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import {
		GroupsStore,
		LoadOrderStore,
		type LoadOrderRow,
		type ModRow,
	} from '@/lib/store';

	type Props = {
		rows: readonly LoadOrderRow[];
		onrename: (mod: Mod) => void;
		ondetails: (mod: Mod) => void;
		onpriority: (rows: readonly LoadOrderRow[]) => void;
	};

	let { rows, onrename, ondetails, onpriority }: Props = $props();

	const groupsStore = GroupsStore.get();
	const loadOrderStore = LoadOrderStore.get();

	const first = $derived(rows[0]);
	const modRows = $derived(
		rows.filter((row): row is ModRow => row.kind === 'mod')
	);
	const mods = $derived(modRows.map((row) => row.mod));
	const canRemove = $derived(modRows.some((row) => !row.member));
</script>

{#snippet collapseItem(row: Exclude<LoadOrderRow, ModRow>)}
	<ContextMenu.Item
		onSelect={() => loadOrderStore.setCollapsed(row, !row.entry.collapsed)}
	>
		{row.entry.collapsed
			? t('loadOrder.band.expand')
			: t('loadOrder.band.collapse')}
	</ContextMenu.Item>
{/snippet}

{#snippet enableItems(targets: readonly LoadOrderRow[])}
	<ContextMenu.Item onSelect={() => loadOrderStore.setEnabled(targets, true)}>
		{t('common.enable')}
	</ContextMenu.Item>
	<ContextMenu.Item
		onSelect={() => loadOrderStore.setEnabled(targets, false)}
	>
		{t('common.disable')}
	</ContextMenu.Item>
{/snippet}

{#if first?.kind === 'mod'}
	{@render enableItems(rows)}
	<ContextMenu.Sub>
		<ContextMenu.SubTrigger
			>{t('loadOrder.move.menu')}</ContextMenu.SubTrigger
		>
		<ContextMenu.SubContent class="min-w-44">
			<LoadOrderMoveItems
				rows={modRows}
				menu="context"
				onpriority={() => onpriority(modRows)}
			/>
		</ContextMenu.SubContent>
	</ContextMenu.Sub>
	<ContextMenu.Sub>
		<ContextMenu.SubTrigger
			>{t('loadOrder.menu.addTag')}</ContextMenu.SubTrigger
		>
		<ContextMenu.SubContent class="min-w-44">
			<TagChecklistItems {mods} menu="context" />
		</ContextMenu.SubContent>
	</ContextMenu.Sub>
	{#if rows.length === 1}
		<ContextMenu.Separator />
		<ContextMenu.Item onSelect={() => onrename(first.mod)}>
			{t('common.rename')}
		</ContextMenu.Item>
		<ContextMenu.Item onSelect={() => ondetails(first.mod)}>
			{t('loadOrder.menu.details')}
		</ContextMenu.Item>
		<ContextMenu.Separator />
		<ModContextMenuItems mod={first.mod} />
	{/if}
	<ContextMenu.Separator />
	<ContextMenu.Item
		variant="destructive"
		disabled={!canRemove}
		onSelect={() => loadOrderStore.remove(rows)}
	>
		{t('common.removeFromProfile')}
	</ContextMenu.Item>
{:else if first?.kind === 'separator'}
	{@render collapseItem(first)}
	<ContextMenu.Separator />
	<ContextMenu.Item
		variant="destructive"
		onSelect={() => loadOrderStore.remove([first])}
	>
		{t('loadOrder.menu.deleteSeparator')}
	</ContextMenu.Item>
{:else if first?.kind === 'group'}
	{@render collapseItem(first)}
	{@render enableItems([first])}
	<ContextMenu.Item onSelect={() => groupsStore.open(first.group)}>
		{t('common.editGroup')}
	</ContextMenu.Item>
	<ContextMenu.Separator />
	<ContextMenu.Item
		variant="destructive"
		onSelect={() => loadOrderStore.remove([first])}
	>
		{t('loadOrder.menu.unlinkGroup')}
	</ContextMenu.Item>
{/if}
