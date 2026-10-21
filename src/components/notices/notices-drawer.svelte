<script lang="ts">
	import { untrack } from 'svelte';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import InfoIcon from '@lucide/svelte/icons/info';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	import Drawer from '@/components/drawer.svelte';
	import RemoveModsDialog from '@/components/remove-mods-dialog.svelte';
	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import { toggleVariants } from '@/components/ui/toggle';

	import { t, timeAgo } from '@/lib/i18n';
	import type { MessageValues } from '@/lib/i18n/messages';
	import type { Mod, ModDependency } from '@/lib/models';
	import {
		NOTICE_GROUPS,
		categoriesIn,
		type NoticeCategory,
		type NoticeGroup,
	} from '@/lib/notices/categories';
	import {
		GamesStore,
		NoticesStore,
		type Notice,
		type NoticesTab,
	} from '@/lib/store';

	import NoticeCategoryBlock from './notice-category.svelte';

	type ScopeValues = {
		key: 'library' | 'group' | 'profile' | 'noProfile';
		values: MessageValues;
	};

	const TABS: NoticesTab[] = ['all', 'action', 'know'];
	const RESOLVED_MS = 2000;

	const gamesStore = GamesStore.get();
	const noticesStore = NoticesStore.get();

	const chipClasses = toggleVariants({ variant: 'filter', size: 'sm' });

	let root = $state<HTMLElement | null>(null);
	let removing = $state.raw<Mod | null>(null);
	let subscribing = $state.raw<readonly ModDependency[]>([]);
	let lingering = $state.raw<readonly Notice[]>([]);
	let known: Record<string, Notice> = {};
	let knownScope = '';

	const filterMod = $derived(noticesStore.filterMod);
	const isFiltered = $derived(
		filterMod !== null || noticesStore.search.trim() !== ''
	);
	const lingeringShown = $derived(
		filterMod
			? lingering.filter((notice) => notice.mod === filterMod)
			: lingering
	);
	const byCategory = $derived(
		Map.groupBy<NoticeCategory, Notice>(
			noticesStore.shown,
			(notice) => notice.category
		)
	);
	const resolvedByCategory = $derived(
		Map.groupBy<NoticeCategory, Notice>(
			lingeringShown,
			(notice) => notice.category
		)
	);
	const shownGroups = $derived(
		NOTICE_GROUPS.filter(
			(group) => noticesStore.tab === 'all' || noticesStore.tab === group
		)
	);
	const isAllClear = $derived(
		!noticesStore.list.length && !lingering.length && !isFiltered
	);
	const hasAnyShown = $derived(
		shownGroups.some((group) => categoriesShown(group).length)
	);
	const scopeValues = $derived.by((): ScopeValues => {
		const scope = noticesStore.scope;
		const game = gamesStore.current!.title;
		switch (scope.kind) {
			case 'library':
				return { key: 'library', values: { game } };
			case 'group':
				return {
					key: 'group',
					values: { game, group: scope.group?.name ?? '' },
				};
			case 'profile':
				return scope.profile
					? {
							key: 'profile',
							values: { game, profile: scope.profile.name },
						}
					: { key: 'noProfile', values: { game } };
		}
	});
	const subtitle = $derived(
		filterMod
			? t('notices.subtitle.filtered')
			: t(`notices.subtitle.${scopeValues.key}`, scopeValues.values)
	);
	const emptyText = $derived(
		t(`notices.empty.${scopeValues.key}`, scopeValues.values)
	);
	const checkedText = $derived.by(() => {
		if (noticesStore.isChecking) return t('notices.checking');
		const checkedAt = noticesStore.checkedAt;
		return checkedAt
			? t('notices.checked', { time: timeAgo(checkedAt) })
			: t('notices.notChecked');
	});

	$effect(() => {
		root?.focus();
	});

	$effect(() => {
		const current = noticesStore.list;
		const scope = noticesStore.scopeKey;
		if (scope !== knownScope) {
			knownScope = scope;
			known = Object.fromEntries(
				current.map((notice) => [notice.key, notice])
			);
			return;
		}
		const keys = Object.fromEntries(
			current.map((notice) => [notice.key, true])
		) as Record<string, true>;
		const gone = Object.values(known).filter(
			(notice) => !(notice.key in keys)
		);
		known = Object.fromEntries(
			current.map((notice) => [notice.key, notice])
		);
		if (!gone.length) return;
		lingering = [...untrack(() => lingering), ...gone];
		setTimeout(() => {
			lingering = lingering.filter((notice) => !gone.includes(notice));
		}, RESOLVED_MS);
	});

	function categoriesShown(group: NoticeGroup): NoticeCategory[] {
		return categoriesIn(group).filter(
			(category) =>
				byCategory.has(category) || resolvedByCategory.has(category)
		);
	}

	function groupCount(group: NoticeGroup): number {
		return categoriesIn(group).reduce(
			(sum, category) => sum + (byCategory.get(category)?.length ?? 0),
			0
		);
	}

	function tabCount(tab: NoticesTab): number {
		return tab === 'all' ? noticesStore.shown.length : groupCount(tab);
	}

	function askSubscribe(requirements: readonly ModDependency[]): void {
		subscribing = noticesStore.toSubscribe(requirements);
	}

	async function confirmSubscribe(): Promise<void> {
		const requirements = subscribing;
		subscribing = [];
		await noticesStore.subscribe(requirements);
	}

	function onkeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		if (filterMod) noticesStore.clearFilter();
		else noticesStore.close();
	}
</script>

<Drawer label={t('notices.title')}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={root}
		tabindex="-1"
		class="flex min-h-0 flex-1 flex-col outline-0"
		{onkeydown}
	>
		<div class="flex items-start gap-2.5 px-4.5 pt-4.5 pb-2.5">
			<div class="min-w-0 flex-1">
				<h2 class="text-lg font-bold">{t('notices.title')}</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={t('common.close')}
				onclick={() => noticesStore.close()}
			>
				<XIcon />
			</Button>
		</div>
		<div class="flex flex-col gap-2 border-b px-4.5 pb-2.5">
			<InputGroup.Root>
				<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
				{#if filterMod}
					<InputGroup.Addon>
						<span
							class="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-fill-3 pr-1 pl-2 text-xs font-semibold whitespace-nowrap text-foreground"
						>
							<span class="max-w-48 truncate"
								>{filterMod.displayTitle}</span
							>
							<button
								type="button"
								class="grid size-4.5 cursor-pointer place-items-center rounded-full text-foreground-2 hover:bg-fill-2 hover:text-foreground"
								aria-label={t('notices.showAll')}
								onclick={() => noticesStore.clearFilter()}
							>
								<XIcon class="size-3" />
							</button>
						</span>
					</InputGroup.Addon>
				{/if}
				<InputGroup.Input
					type="search"
					placeholder={t('notices.filterPlaceholder')}
					aria-label={t('notices.filterPlaceholder')}
					bind:value={
						() => noticesStore.search,
						(search) => (noticesStore.search = search)
					}
				/>
			</InputGroup.Root>
			<div class="flex gap-1">
				{#each TABS as tab (tab)}
					<button
						type="button"
						class={chipClasses}
						aria-pressed={noticesStore.tab === tab}
						onclick={() => (noticesStore.tab = tab)}
					>
						{t(`notices.tabs.${tab}`)}
						<b class="font-mono text-2xs font-normal opacity-70">
							{tabCount(tab)}
						</b>
					</button>
				{/each}
			</div>
		</div>
		{#if filterMod}
			<div
				class="mx-2 mt-2 flex items-center gap-1.5 rounded-lg bg-fill-1 px-2.5 py-1.5 text-xs text-foreground-2"
			>
				<InfoIcon class="size-3.5 shrink-0" />
				<span class="flex-1">
					{t('notices.filtered', {
						count: noticesStore.shown.length,
					})}
				</span>
				<Button
					variant="ghost"
					size="xs"
					onclick={() => noticesStore.clearFilter()}
				>
					{t('notices.showAll')}
				</Button>
			</div>
		{/if}
		<div class="min-h-0 flex-1 overflow-y-auto px-2.5 pt-1 pb-3">
			{#if isAllClear}
				<div
					class="flex flex-col items-center gap-1.5 px-6 pt-7 pb-4 text-center"
				>
					<span
						class="mb-1.5 grid size-14 place-items-center rounded-full bg-status-ok/12 text-status-ok"
					>
						<CircleCheckIcon class="size-6" />
					</span>
					<b class="text-sm">{t('notices.empty.title')}</b>
					<p
						class="max-w-80 text-xs leading-normal text-muted-foreground"
					>
						{emptyText}
					</p>
				</div>
				<h3
					class="flex items-center gap-2 px-2 pt-3 pb-1.5 text-2xs font-bold tracking-[0.07em] text-foreground-4 uppercase"
				>
					{t('notices.empty.watches')}
				</h3>
				{#each noticesStore.categories as category (category)}
					<NoticeCategoryBlock
						{category}
						notices={[]}
						resolved={[]}
						onremove={(mod) => (removing = mod)}
						onsubscribe={askSubscribe}
					/>
				{/each}
			{:else}
				{#each shownGroups as group (group)}
					{@const categories = categoriesShown(group)}
					{#if categories.length}
						<h3
							class="flex items-center gap-2 px-2 pt-3 pb-1.5 text-2xs font-bold tracking-[0.07em] text-foreground-4 uppercase"
						>
							{t(`notices.groups.${group}`)}
							<span class="font-mono font-medium tracking-normal">
								{groupCount(group)}
							</span>
						</h3>
						{#each categories as category (category)}
							<NoticeCategoryBlock
								{category}
								notices={byCategory.get(category) ?? []}
								resolved={resolvedByCategory.get(category) ??
									[]}
								onremove={(mod) => (removing = mod)}
								onsubscribe={askSubscribe}
							/>
						{/each}
					{/if}
				{/each}
				{#if !hasAnyShown}
					<p
						class="px-3 py-6 text-center text-sm text-muted-foreground"
					>
						{t('notices.noMatch')}
					</p>
				{/if}
			{/if}
		</div>
		<div
			class="flex items-center gap-2 border-t px-4.5 py-2.5 text-xs text-muted-foreground"
		>
			<ClockIcon class="size-3.5 shrink-0" />
			<span class="flex-1">{checkedText}</span>
			<Button
				variant="ghost"
				size="xs"
				disabled={noticesStore.isChecking}
				onclick={() => noticesStore.checkNow()}
			>
				<RefreshCwIcon
					class={noticesStore.isChecking ? 'animate-spin' : undefined}
				/>
				{t('notices.checkNow')}
			</Button>
		</div>
	</div>
</Drawer>

<RemoveModsDialog
	bind:open={
		() => removing !== null,
		(isOpen) => {
			if (!isOpen) removing = null;
		}
	}
	mods={removing ? [removing] : []}
	onremoved={() => (removing = null)}
/>

<AlertDialog.Root
	bind:open={
		() => subscribing.length > 0,
		(isOpen) => {
			if (!isOpen) subscribing = [];
		}
	}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('notices.subscribe.title', { count: subscribing.length })}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('notices.subscribe.description')}
				<ul class="mt-2 flex list-disc flex-col gap-1 pl-4">
					{#each subscribing as requirement (requirement.required_ref)}
						<li>
							{requirement.required_title ??
								t('modDetails.dependencies.unknownTitle', {
									id: requirement.required_ref,
								})}
						</li>
					{/each}
				</ul>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmSubscribe}>
				{t('notices.subscribe.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
