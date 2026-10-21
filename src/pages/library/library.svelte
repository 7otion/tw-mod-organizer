<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import Columns3CogIcon from '@lucide/svelte/icons/columns-3-cog';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import PackageIcon from '@lucide/svelte/icons/package';
	import SearchIcon from '@lucide/svelte/icons/search';

	import ModDetailsPanel from '@/components/mod-details/mod-details-panel.svelte';
	import NoticeStrip from '@/components/notices/notice-strip.svelte';
	import { Button } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import { Kbd } from '@/components/ui/kbd';
	import * as Select from '@/components/ui/select';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { formatSize, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { ModTable } from '@/lib/mod-table/mod-table-state.svelte';
	import ModTableView from '@/lib/mod-table/mod-table.svelte';
	import type { Profile } from '@/lib/models';
	import {
		AppStore,
		GamesStore,
		LibraryFilterStore,
		LibraryScanStore,
		LibraryStore,
		ProfilesStore,
		TableLayoutStore,
		type LibraryScope,
	} from '@/lib/store';
	import { cn } from '@/lib/utils';

	import LibraryBulkActions from './library-bulk-actions.svelte';
	import { LIBRARY_LAYOUT } from './library-layout';

	type ProfileScope = Exclude<LibraryScope, 'all'>;

	const PROFILE_SCOPES: ProfileScope[] = ['has', 'lacks'];

	const appStore = AppStore.get();
	const gamesStore = GamesStore.get();
	const libraryStore = LibraryStore.get();
	const libraryScanStore = LibraryScanStore.get();
	const libraryFilterStore = LibraryFilterStore.get();
	const profilesStore = ProfilesStore.get();
	const tableLayoutStore = TableLayoutStore.get();

	const layout = tableLayoutStore.layoutOf(LIBRARY_LAYOUT);

	const table = new ModTable({
		layout,
		settingsTitleKey: 'library.table.title',
		rows: () => libraryFilterStore.visibleMods,
		keyOf: (mod) => mod.id,
		modOf: (mod) => mod,
		isSelectable: true,
		sort: {
			get key() {
				return libraryFilterStore.sort;
			},
			get isDescending() {
				return libraryFilterStore.isDescending;
			},
			sortBy: (sort) => void libraryFilterStore.sortBy(sort),
		},
		scrollMemory: {
			key: () => gamesStore.current?.app_id ?? null,
			saved: () => layout.savedScrollOffset,
			isFiltered: () => libraryFilterStore.isFiltered,
			save: (appId, offset) => void layout.setScrollOffset(appId, offset),
		},
	});

	let searchInput = $state<HTMLInputElement | null>(null);

	const modCount = $derived(libraryStore.list.length);
	const totalSize = $derived(
		libraryStore.list.reduce((sum, mod) => sum + (mod.size_bytes ?? 0), 0)
	);

	function onkeydown(event: KeyboardEvent): void {
		if (event.ctrlKey && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			searchInput?.focus();
		} else {
			table.handleKeydown(event);
		}
	}

	function openWorkshop(): void {
		void openUrl(
			`https://steamcommunity.com/app/${gamesStore.current!.app_id}/workshop/`
		);
	}
</script>

{#snippet profileDot(profile: Profile)}
	<span
		class={cn(
			'size-2 shrink-0 rounded-full',
			profile === profilesStore.active
				? 'bg-pink'
				: 'shadow-[inset_0_0_0_1.5px_var(--text-4)]'
		)}
	></span>
{/snippet}

<svelte:window {onkeydown} />

<div class="relative flex min-h-0 flex-1 flex-col">
	<div class="flex items-center gap-6 px-9 pt-7 pb-5">
		<h1
			class="font-blackletter text-title leading-none font-medium [text-box:trim-both_cap_alphabetic]"
		>
			{t('library.title')}
		</h1>
		<p
			class="flex items-center gap-4 text-md font-medium text-muted-foreground"
		>
			<span>
				<Message key="library.stats.mods" values={{ count: modCount }}>
					{#snippet value(text)}
						<b class="font-bold text-foreground-2">{text}</b>
					{/snippet}
				</Message>
			</span>
			<b class="font-bold text-foreground-2">{formatSize(totalSize)}</b>
			<span>
				<Message
					key="library.stats.unused"
					values={{ count: libraryStore.unusedCount }}
				>
					{#snippet value(text)}
						<b class="font-bold text-foreground-2">{text}</b>
					{/snippet}
				</Message>
			</span>
		</p>
		<InputGroup.Root class="ml-4 flex-1">
			<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
			<InputGroup.Input
				type="search"
				placeholder={t('library.search.placeholder', {
					count: modCount,
				})}
				aria-label={t('library.search.label')}
				bind:ref={searchInput}
				bind:value={
					() => libraryFilterStore.search,
					(search) => libraryFilterStore.setSearch(search)
				}
			/>
			<InputGroup.Addon align="inline-end"
				><Kbd>{t('shortcuts.ctrl', { key: 'F' })}</Kbd
				></InputGroup.Addon
			>
		</InputGroup.Root>
	</div>

	<div class="flex items-center gap-2 px-9 pb-5">
		<Select.Root
			type="single"
			bind:value={
				() => String(libraryFilterStore.scopeProfile?.id ?? ''),
				(id) => {
					const profile = profilesStore.list.find(
						(profile) => String(profile.id) === id
					);
					if (profile) void libraryFilterStore.pickProfile(profile);
				}
			}
		>
			<Select.Trigger
				size="sm"
				aria-label={t('library.filter.profile')}
				class="min-w-48 font-semibold"
			>
				{#if libraryFilterStore.scopeProfile}
					{@render profileDot(libraryFilterStore.scopeProfile)}
				{/if}
				<span class="flex-1 truncate text-left">
					{libraryFilterStore.scopeProfile?.name}
				</span>
			</Select.Trigger>
			<Select.Content align="start">
				{#each profilesStore.list as profile (profile.id)}
					<Select.Item
						value={String(profile.id)}
						label={profile.name}
					>
						{@render profileDot(profile)}
						<span class="flex-1">{profile.name}</span>
						<span class="font-mono text-xs text-muted-foreground">
							{libraryFilterStore.profileCounts[profile.id] ?? 0}
						</span>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<ToggleGroup.Root
			type="single"
			variant="filter"
			size="lg"
			spacing={1}
			aria-label={t('library.filter.scope')}
			bind:value={
				() =>
					libraryFilterStore.scope === 'all'
						? ''
						: libraryFilterStore.scope,
				(scope) =>
					void libraryFilterStore.setScope(
						scope ? (scope as ProfileScope) : 'all'
					)
			}
		>
			{#each PROFILE_SCOPES as scope (scope)}
				<ToggleGroup.Item value={scope}>
					{t(`library.filter.scopes.${scope}`)}
					<b
						class="font-mono text-xs font-normal text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground/60"
					>
						{libraryFilterStore.scopeCounts[scope]}
					</b>
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
		<span class="flex-1"></span>
		<NoticeStrip />
		<Button
			variant="outline"
			aria-haspopup="dialog"
			onclick={() => (table.isSettingsOpen = true)}
		>
			<Columns3CogIcon />
			{t('modTable.settingsButton')}
		</Button>
	</div>

	<ModTableView {table} isEmpty={!modCount}>
		{#snippet belowHeader()}
			<div
				class={cn(
					'mx-6 h-px',
					libraryScanStore.isScanning &&
						'animate-pulse bg-status-update'
				)}
			></div>
		{/snippet}
		{#snippet empty()}
			<div
				class="flex flex-1 flex-col items-center justify-center gap-4 pb-16"
			>
				<span
					class="relative grid size-18 place-items-center rounded-full bg-fill-1"
				>
					{#if libraryScanStore.isScanning}
						<span
							class="absolute size-4 animate-ping rounded-full bg-pink/50"
						></span>
					{/if}
					<span class="relative size-2 rounded-full bg-pink"></span>
				</span>
				<p class="text-lg font-semibold">
					{libraryScanStore.isScanning
						? t('library.empty.scanning')
						: t('library.empty.title')}
				</p>
				<div class="flex gap-2">
					<Button onclick={() => appStore.openInstallMod()}>
						<PackageIcon />
						{t('library.empty.install')}
					</Button>
					<Button variant="secondary" onclick={openWorkshop}>
						{t('library.empty.workshop')}
						<ExternalLinkIcon />
					</Button>
				</div>
			</div>
		{/snippet}
		{#snippet noRows()}
			<p class="px-11 py-6 text-md text-muted-foreground">
				{t('library.noMatch')}
			</p>
		{/snippet}
		{#snippet bulkActions(selection)}
			<LibraryBulkActions {selection} />
		{/snippet}
	</ModTableView>

	{#if table.detailsMod}
		<ModDetailsPanel
			mod={table.detailsMod}
			context="library"
			onopen={(opened) => table.openDetails(opened)}
			onclose={() => table.closeDetails()}
		/>
	{/if}
</div>
