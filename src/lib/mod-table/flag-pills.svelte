<script lang="ts" module>
	import { t } from '@/lib/i18n';
	import {
		NOTICE_CATEGORY_SPECS,
		type NoticeCategory,
	} from '@/lib/notices/categories';

	import { icon } from './row-icons.svelte';

	export type FlagSize = 'band' | 'row' | 'large';

	export const SHOWN_FLAGS = 3;

	const PILL: Record<FlagSize, string> = {
		band: 'size-[18px] rounded-[5px]',
		row: 'size-5 rounded-[5px]',
		large: 'size-6 rounded-md',
	};
	const ICON: Record<FlagSize, string> = {
		band: 'size-3',
		row: 'size-[13px]',
		large: 'size-[15px]',
	};
	const PILL_BASE =
		'inline-grid cursor-pointer place-items-center outline-0 transition-colors duration-120';

	export function shownFlags(
		flags: readonly NoticeCategory[]
	): readonly NoticeCategory[] {
		return flags.length > SHOWN_FLAGS
			? flags.slice(0, SHOWN_FLAGS - 1)
			: flags;
	}

	export { flagPills };
</script>

{#snippet flagPills(
	flags: readonly NoticeCategory[],
	size: FlagSize,
	isActive: boolean,
	onclick: (event: MouseEvent, category: NoticeCategory | null) => void
)}
	{@const shown = shownFlags(flags)}
	<span class="flex items-center gap-[3px]">
		{#each shown as category (category)}
			<button
				type="button"
				data-flag={category}
				aria-label={t(`notices.categories.${category}.name`)}
				style:--c={NOTICE_CATEGORY_SPECS[category].color}
				class={[
					PILL_BASE,
					PILL[size],
					'bg-(--c)/15 text-(--c) hover:bg-(--c)/28 focus-visible:bg-(--c)/28',
					isActive && 'shadow-[0_0_0_1.5px_var(--c)]',
				]}
				onclick={(event) => onclick(event, category)}
				ondblclick={(event) => event.stopPropagation()}
			>
				{@render icon(NOTICE_CATEGORY_SPECS[category].icon, ICON[size])}
			</button>
		{/each}
		{#if flags.length > SHOWN_FLAGS}
			<button
				type="button"
				data-flag="more"
				aria-label={t('notices.moreFlags', {
					count: flags.length - shown.length,
				})}
				class={[
					PILL_BASE,
					PILL[size],
					'bg-fill-2 font-mono text-3xs font-semibold text-foreground-2 hover:bg-fill-3 focus-visible:bg-fill-3',
				]}
				onclick={(event) => onclick(event, null)}
				ondblclick={(event) => event.stopPropagation()}
			>
				+{flags.length - shown.length}
			</button>
		{/if}
	</span>
{/snippet}
