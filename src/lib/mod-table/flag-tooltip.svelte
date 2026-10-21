<script lang="ts" module>
	import type { Mod } from '@/lib/models';
	import type { NoticeCategory } from '@/lib/notices/categories';

	export type FlagTarget = {
		anchor: HTMLElement;
		mod: Mod;
		category: NoticeCategory | null;
	};
</script>

<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';

	import {
		categoryIcon,
		reason,
		scopeChip,
	} from '@/components/notices/notice-parts.svelte';
	import * as Tooltip from '@/components/ui/tooltip';

	import { t } from '@/lib/i18n';
	import { NOTICE_CATEGORY_SPECS } from '@/lib/notices/categories';
	import { NoticesStore, ProfilesStore } from '@/lib/store';

	import { SHOWN_FLAGS } from './mod-row.svelte';

	let { target }: { target: FlagTarget | null } = $props();

	const noticesStore = NoticesStore.get();
	const profilesStore = ProfilesStore.get();

	const notice = $derived.by(() => {
		if (!target?.category) return null;
		const category = target.category;
		return (
			noticesStore
				.noticesOf(target.mod)
				.find((notice) => notice.category === category) ?? null
		);
	});
	const hidden = $derived(
		target ? noticesStore.flagsOf(target.mod).slice(SHOWN_FLAGS - 1) : []
	);
</script>

<Tooltip.Root open={target !== null}>
	{#if target}
		<Tooltip.Content
			customAnchor={target.anchor}
			side="bottom"
			align="start"
			sideOffset={6}
			class="w-[300px] flex-col items-stretch gap-1.5 px-3 py-2.5 text-xs text-foreground-2"
		>
			{#if notice}
				{@const spec = NOTICE_CATEGORY_SPECS[notice.category]}
				<span
					class="flex items-center gap-2 text-[12.5px] font-bold text-foreground"
					style:--c={spec.color}
				>
					{@render categoryIcon(
						notice.category,
						'size-3.5 shrink-0 text-(--c)'
					)}
					{t(`notices.categories.${notice.category}.name`)}
					<span class="ml-auto">
						{@render scopeChip(
							spec.scope,
							profilesStore.active?.name ?? ''
						)}
					</span>
				</span>
				<p class="leading-[1.45]">
					{@render reason(notice)}
					{#if notice.category === 'order'}
						{t('notices.reason.orderPosition', {
							position: notice.number,
						})}
					{/if}
				</p>
				<span
					class="flex items-center gap-1.5 border-t border-white/8 pt-1.5 text-[11.5px] text-muted-foreground"
				>
					<BellIcon class="size-3.5" />
					{t('notices.flagHint')}
				</span>
			{:else}
				<span
					class="flex items-center gap-2 text-[12.5px] font-bold text-foreground"
				>
					<BellIcon class="size-3.5" />
					{t('notices.moreFlags', { count: hidden.length })}
				</span>
				<p class="leading-[1.45]">
					{hidden
						.map((category) =>
							t(`notices.categories.${category}.name`)
						)
						.join(' · ')}
				</p>
				<span
					class="flex items-center gap-1.5 border-t border-white/8 pt-1.5 text-[11.5px] text-muted-foreground"
				>
					<BellIcon class="size-3.5" />
					{t('notices.moreHint')}
				</span>
			{/if}
		</Tooltip.Content>
	{/if}
</Tooltip.Root>
