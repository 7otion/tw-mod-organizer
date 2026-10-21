<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';

	import { t } from '@/lib/i18n';
	import {
		NOTICE_CATEGORIES,
		NOTICE_CATEGORY_SPECS,
	} from '@/lib/notices/categories';
	import { NoticesStore } from '@/lib/store';

	import { categoryIcon } from './notice-parts.svelte';

	const noticesStore = NoticesStore.get();

	const counts = $derived(noticesStore.counts);
	const shown = $derived(
		NOTICE_CATEGORIES.filter((category) => counts[category] > 0)
	);
</script>

<div
	class="inline-flex h-8 items-center gap-0.5 rounded-full bg-fill-1 px-[3px]"
>
	{#if shown.length}
		<button
			type="button"
			aria-haspopup="dialog"
			class="inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs font-semibold text-foreground-2 hover:bg-fill-2 hover:text-foreground"
			onclick={() => noticesStore.open()}
		>
			<BellIcon class="size-3.5" />
			{t('notices.title')}
		</button>
		<span class="mx-0.5 h-3.5 w-px bg-line-2"></span>
		{#each shown as category (category)}
			<button
				type="button"
				aria-haspopup="dialog"
				aria-label="{t(`notices.categories.${category}.name`)}, {counts[
					category
				]}"
				style:--c={NOTICE_CATEGORY_SPECS[category].color}
				class="inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded-full pr-2 pl-1.5 font-mono text-[11.5px] text-(--c) hover:bg-(--c)/14"
				onclick={() => noticesStore.open({ category })}
			>
				{@render categoryIcon(category, 'size-[13px]')}
				{counts[category]}
			</button>
		{/each}
	{:else}
		<span
			class="inline-flex h-6.5 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs font-semibold text-status-ok"
		>
			<CircleCheckIcon class="size-3.5" />
			{t('notices.allClear')}
		</span>
	{/if}
</div>
