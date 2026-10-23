<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import LayersIcon from '@lucide/svelte/icons/layers';

	import { Badge } from '@/components/ui/badge';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import { enableBox } from '@/lib/mod-table/enable-box.svelte';
	import { flagPills } from '@/lib/mod-table/flag-pills.svelte';
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
	import { tagColor } from '@/lib/tag-swatches';

	type Props = {
		row: SeparatorRow | GroupRow;
		onedit: (separator: Separator) => void;
	};

	let { row, onedit }: Props = $props();

	const groupsStore = GroupsStore.get();
	const loadOrderStore = LoadOrderStore.get();
	const noticesStore = NoticesStore.get();

	const mods = $derived(row.kind === 'separator' ? row.mods : row.members);
	const isCollapsed = $derived(row.entry.collapsed);
	const enabled = $derived(loadOrderStore.enableStateOf(row));
	const color = $derived(
		tagColor(
			row.kind === 'separator'
				? row.separator.background_color
				: row.group.color
		)
	);
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
		if (!isCollapsed) return [];
		return NOTICE_CATEGORIES.filter((category) =>
			mods.some((mod) => noticesStore.flagsOf(mod.mod).includes(category))
		);
	});

	function toggle(event: MouseEvent): void {
		event.stopPropagation();
		void loadOrderStore.setCollapsed(row, !isCollapsed);
	}

	function toggleEnabled(event: MouseEvent): void {
		event.stopPropagation();
		void loadOrderStore.setEnabled([row], enabled !== true);
	}

	function openNotices(
		event: MouseEvent,
		category: NoticeCategory | null
	): void {
		event.stopPropagation();
		noticesStore.open(category ? { category } : {});
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	style:--c={color}
	class={[
		'group grid h-full grid-cols-(--table-columns) items-center gap-x-3 text-[13px] font-semibold',
		'bg-(--c)/9',
		row.kind === 'separator' || isCollapsed ? 'rounded-md' : 'rounded-t-md',
	]}
	ondblclick={toggle}
>
	<span
		data-handle
		class="grid h-full cursor-grab place-items-center text-foreground-4 group-hover:text-muted-foreground"
	>
		<GripVerticalIcon class="size-5" />
	</span>
	<button
		type="button"
		class="grid size-5 cursor-pointer place-items-center justify-self-center text-foreground"
		aria-expanded={!isCollapsed}
		aria-label={isCollapsed
			? t('loadOrder.band.expand')
			: t('loadOrder.band.collapse')}
		onclick={toggle}
	>
		{#if isCollapsed}
			<ChevronRightIcon class="size-4" />
		{:else}
			<ChevronDownIcon class="size-4" />
		{/if}
	</button>
	<span class="grid place-items-center">
		{#if enabled !== null}
			{@render enableBox(
				enabled,
				t('modTable.row.enabled'),
				toggleEnabled
			)}
		{/if}
	</span>
	<div class="col-[4/-1] flex min-w-0 items-center gap-2 pr-2">
		{#if row.kind === 'group'}
			<LayersIcon class="size-4 shrink-0 text-(--c)" />
			<span class="truncate">{row.group.name}</span>
			<Badge variant="secondary">{t('loadOrder.band.group')}</Badge>
		{:else}
			<span class="size-2 shrink-0 rounded-full bg-(--c)"></span>
			<span class="truncate">{row.separator.title}</span>
		{/if}
		<span class="truncate text-xs font-medium text-muted-foreground"
			>{meta}</span
		>
		<span class="flex-1"></span>
		{#if flags.length}
			{@render flagPills(flags, 'band', false, openNotices)}
		{/if}
		{#if isCollapsed && range}
			<span class="font-mono text-xs font-medium text-muted-foreground">
				{range}
			</span>
		{/if}
		{#if row.kind === 'group'}
			{@const group = row.group}
			<Button
				variant="ghost"
				size="xs"
				onclick={() => groupsStore.open(group)}
			>
				{t('common.editGroup')}
			</Button>
		{:else}
			{@const separator = row.separator}
			<Button variant="ghost" size="xs" onclick={() => onedit(separator)}>
				{t('loadOrder.band.editSeparator')}
			</Button>
		{/if}
	</div>
</div>
