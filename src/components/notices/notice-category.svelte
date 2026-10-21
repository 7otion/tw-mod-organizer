<script lang="ts">
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import DownloadIcon from '@lucide/svelte/icons/download';

	import { Badge } from '@/components/ui/badge';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import type { Mod, ModDependency } from '@/lib/models';
	import {
		NOTICE_CATEGORY_SPECS,
		type NoticeCategory,
	} from '@/lib/notices/categories';
	import { NoticesStore, ProfilesStore, type Notice } from '@/lib/store';

	import NoticeEntry from './notice-entry.svelte';
	import { categoryIcon, scopeChip } from './notice-parts.svelte';

	type Props = {
		category: NoticeCategory;
		notices: readonly Notice[];
		resolved: readonly Notice[];
		onremove: (mod: Mod) => void;
		onsubscribe: (requirements: readonly ModDependency[]) => void;
	};

	const FOLDED_ENTRIES = 2;

	let { category, notices, resolved, onremove, onsubscribe }: Props =
		$props();

	const noticesStore = NoticesStore.get();
	const profilesStore = ProfilesStore.get();

	const spec = $derived(NOTICE_CATEGORY_SPECS[category]);

	let isExpanded = $state(false);

	const isCollapsed = $derived(noticesStore.collapsed.has(category));
	const all = $derived([...notices, ...resolved]);
	const isEmpty = $derived(!all.length);
	const shown = $derived(
		spec.group === 'know' && !isExpanded
			? all.slice(0, FOLDED_ENTRIES)
			: all
	);
	const profileName = $derived(profilesStore.active?.name ?? '');
</script>

<section
	id="notice-{category}"
	style:--c={spec.color}
	class={[
		'mb-1.5 rounded-[10px] bg-white/[0.022]',
		!isCollapsed && !isEmpty && 'pb-1',
		isEmpty &&
			'bg-transparent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
	]}
>
	<header
		class={[
			'flex gap-2 pr-1.5 pl-2',
			isEmpty ? 'items-start py-2.5' : 'h-10 items-center',
		]}
	>
		{#if !isEmpty}
			<button
				type="button"
				class="grid size-5 shrink-0 cursor-pointer place-items-center text-muted-foreground hover:text-foreground"
				aria-expanded={!isCollapsed}
				aria-label={t(`notices.categories.${category}.name`)}
				onclick={() => noticesStore.toggleCollapsed(category)}
			>
				{#if isCollapsed}
					<ChevronRightIcon class="size-4" />
				{:else}
					<ChevronDownIcon class="size-4" />
				{/if}
			</button>
		{/if}
		{@render categoryIcon(
			category,
			['size-4 shrink-0 text-(--c)', isEmpty && 'mt-0.5'].join(' ')
		)}
		<span class="flex min-w-0 flex-1 flex-col gap-0.5">
			<span class="flex items-center gap-2">
				<span class="truncate text-[13px] font-bold">
					{t(`notices.categories.${category}.name`)}
				</span>
				<span class="font-mono text-[11.5px] text-muted-foreground">
					{all.length}
				</span>
				{#if spec.isPlanned}
					<Badge variant="secondary"
						>{t('notices.empty.planned')}</Badge
					>
				{/if}
			</span>
			{#if isEmpty}
				<span class="text-xs leading-[1.45] text-muted-foreground">
					{t(`notices.categories.${category}.description`)}
				</span>
			{/if}
		</span>
		{#if spec.scope === 'profile' || isEmpty}
			{@render scopeChip(spec.scope, profileName)}
		{/if}
		{#if category === 'missing' && notices.length}
			<Button
				variant="ghost"
				size="xs"
				onclick={() => onsubscribe(noticesStore.missingRequirements)}
			>
				<DownloadIcon />
				{t('notices.actions.subscribeAll')}
			</Button>
		{:else if category === 'steam' && notices.length}
			<Button
				variant="ghost"
				size="xs"
				onclick={() => noticesStore.markAllSeen()}
			>
				<CheckCheckIcon />
				{t('notices.actions.markAllSeen')}
			</Button>
		{/if}
	</header>
	{#if !isCollapsed && !isEmpty}
		<ul class="flex flex-col">
			{#each shown as notice (notice.key)}
				<NoticeEntry
					{notice}
					isResolved={resolved.includes(notice)}
					{onremove}
					{onsubscribe}
				/>
			{/each}
		</ul>
		{#if all.length > shown.length}
			<div class="pt-0.5 pr-2 pb-1 pl-14">
				<Button
					variant="ghost"
					size="xs"
					class="text-muted-foreground"
					onclick={() => (isExpanded = true)}
				>
					{t('notices.showMore', {
						count: all.length - shown.length,
					})}
				</Button>
			</div>
		{/if}
	{/if}
</section>
