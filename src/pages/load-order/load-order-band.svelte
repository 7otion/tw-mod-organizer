<script lang="ts">
	import { t } from '@/lib/i18n';
	import BandRow from '@/lib/mod-table/band-row.svelte';
	import type { Separator } from '@/lib/models';
	import {
		NOTICE_CATEGORIES,
		type NoticeCategory,
	} from '@/lib/notices/categories';
	import {
		GroupsStore,
		LoadOrderStore,
		NoticesStore,
		type GroupRow,
		type SeparatorRow,
	} from '@/lib/store';

	type Props = {
		row: SeparatorRow | GroupRow;
		onedit: (separator: Separator) => void;
	};

	let { row, onedit }: Props = $props();

	const groupsStore = GroupsStore.get();
	const loadOrderStore = LoadOrderStore.get();
	const noticesStore = NoticesStore.get();

	const mods = $derived(row.kind === 'separator' ? row.mods : row.members);
	const meta = $derived.by(() => {
		if (row.kind === 'group')
			return t('loadOrder.band.groupMeta', {
				on: row.enabledCount,
				count: mods.length,
			});
		const count = t('loadOrder.band.mods', { count: mods.length });
		const on =
			row.enabledCount === mods.length
				? t('loadOrder.band.allOn')
				: t('loadOrder.band.someOn', { count: row.enabledCount });
		return mods.length ? `${count} · ${on}` : count;
	});
	const range = $derived(
		mods.length
			? t('loadOrder.band.range', {
					first: mods[0].number,
					last: mods[mods.length - 1].number,
				})
			: ''
	);
	const flags = $derived.by((): NoticeCategory[] => {
		if (!row.entry.collapsed) return [];
		return NOTICE_CATEGORIES.filter((category) =>
			mods.some((mod) => noticesStore.flagsOf(mod.mod).includes(category))
		);
	});
</script>

{#if row.kind === 'group'}
	{@const group = row.group}
	<BandRow
		kind="group"
		title={group.name}
		color={group.color}
		{meta}
		isCollapsed={row.entry.collapsed}
		{range}
		{flags}
		enabled={loadOrderStore.enableStateOf(row)}
		editLabel={t('common.editGroup')}
		oncollapse={(isCollapsed) =>
			loadOrderStore.setCollapsed(row, isCollapsed)}
		onenable={(isEnabled) => loadOrderStore.setEnabled([row], isEnabled)}
		onedit={() => groupsStore.open(group)}
		onflag={(category) => noticesStore.open(category ? { category } : {})}
	/>
{:else}
	{@const separator = row.separator}
	<BandRow
		kind="separator"
		title={separator.title}
		color={separator.background_color}
		{meta}
		isCollapsed={row.entry.collapsed}
		{range}
		{flags}
		enabled={loadOrderStore.enableStateOf(row)}
		editLabel={t('loadOrder.band.editSeparator')}
		oncollapse={(isCollapsed) =>
			loadOrderStore.setCollapsed(row, isCollapsed)}
		onenable={(isEnabled) => loadOrderStore.setEnabled([row], isEnabled)}
		onedit={() => onedit(separator)}
		onflag={(category) => noticesStore.open(category ? { category } : {})}
	/>
{/if}
