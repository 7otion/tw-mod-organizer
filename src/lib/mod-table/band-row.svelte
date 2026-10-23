<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import LayersIcon from '@lucide/svelte/icons/layers';

	import { Badge } from '@/components/ui/badge';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import type { NoticeCategory } from '@/lib/notices/categories';
	import { tagColor } from '@/lib/tag-swatches';

	import { enableBox, type EnableBoxState } from './enable-box.svelte';
	import { flagPills } from './flag-pills.svelte';

	type Props = {
		kind: 'separator' | 'group';
		title: string;
		color: string | null;
		meta: string;
		isCollapsed: boolean;
		canCollapse?: boolean;
		range?: string;
		flags?: readonly NoticeCategory[];
		enabled?: EnableBoxState | null;
		editLabel?: string;
		oncollapse?: (isCollapsed: boolean) => void;
		onenable?: (isEnabled: boolean) => void;
		onedit?: () => void;
		onflag?: (category: NoticeCategory | null) => void;
	};

	let {
		kind,
		title,
		color,
		meta,
		isCollapsed,
		canCollapse = true,
		range = '',
		flags = [],
		enabled = null,
		editLabel,
		oncollapse,
		onenable,
		onedit,
		onflag,
	}: Props = $props();

	function toggle(event: MouseEvent): void {
		if (!canCollapse) return;
		event.stopPropagation();
		oncollapse?.(!isCollapsed);
	}

	function toggleEnabled(event: MouseEvent): void {
		event.stopPropagation();
		onenable?.(enabled !== true);
	}

	function openFlag(
		event: MouseEvent,
		category: NoticeCategory | null
	): void {
		event.stopPropagation();
		onflag?.(category);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	style:--c={tagColor(color)}
	class={[
		'group grid h-full grid-cols-(--table-columns) items-center gap-x-3 bg-(--c)/9 text-[13px] font-semibold',
		kind === 'separator' || isCollapsed ? 'rounded-md' : 'rounded-t-md',
	]}
	ondblclick={toggle}
>
	<span
		data-handle
		class="grid h-full cursor-grab place-items-center text-foreground-4 group-hover:text-muted-foreground"
	>
		<GripVerticalIcon class="size-5" />
	</span>
	<span class="grid place-items-center">
		{#if canCollapse}
			<button
				type="button"
				class="grid size-5 cursor-pointer place-items-center text-foreground"
				aria-expanded={!isCollapsed}
				aria-label={isCollapsed
					? t('modTable.band.expand')
					: t('modTable.band.collapse')}
				onclick={toggle}
			>
				{#if isCollapsed}
					<ChevronRightIcon class="size-4" />
				{:else}
					<ChevronDownIcon class="size-4" />
				{/if}
			</button>
		{/if}
	</span>
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
		{#if kind === 'group'}
			<LayersIcon class="size-4 shrink-0 text-(--c)" />
		{:else}
			<span class="size-2 shrink-0 rounded-full bg-(--c)"></span>
		{/if}
		<span class="truncate">{title}</span>
		{#if kind === 'group'}
			<Badge variant="secondary">{t('modTable.band.group')}</Badge>
		{/if}
		<span class="truncate text-xs font-medium text-muted-foreground"
			>{meta}</span
		>
		<span class="flex-1"></span>
		{#if flags.length}
			{@render flagPills(flags, 'band', false, openFlag)}
		{/if}
		{#if isCollapsed && range}
			<span class="font-mono text-xs font-medium text-muted-foreground">
				{range}
			</span>
		{/if}
		{#if editLabel && onedit}
			<Button variant="ghost" size="xs" onclick={onedit}>
				{editLabel}
			</Button>
		{/if}
	</div>
</div>
