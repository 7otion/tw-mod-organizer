<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleArrowUpIcon from '@lucide/svelte/icons/circle-arrow-up';
	import LinkIcon from '@lucide/svelte/icons/link';
	import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open';
	import UnlinkIcon from '@lucide/svelte/icons/unlink';

	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';

	import type { Mod } from '@/lib/models';
	import type { Selection } from '@/lib/selection.svelte';
	import { selectCellText } from '@/lib/select-cell-text';
	import {
		LibraryColumnsStore,
		LibraryStore,
		SettingsStore,
		type CoverSize,
		type LibraryColumn,
	} from '@/lib/store';
	import { cn, formatDate, formatSize } from '@/lib/utils';

	import { SOURCE_ICON_SIZES } from './library-columns';
	import ModCover from './mod-cover.svelte';
	import ModSourceIcon from './mod-source-icon.svelte';

	type Props = {
		mod: Mod;
		selection: Selection<number>;
	};

	type Mark = {
		icon: LucideIcon;
		label: string;
		class: string;
	};

	const ROW_HEIGHTS: Record<CoverSize, string> = {
		none: 'h-row-compact',
		compact: 'h-row-regular',
		regular: 'h-14',
		large: 'h-row-large',
		huge: 'h-27',
	};

	const SHOWN_TAGS = 2;
	const SHOWN_PROFILES = 2;

	let { mod, selection }: Props = $props();

	const libraryStore = LibraryStore.get();
	const libraryColumnsStore = LibraryColumnsStore.get();
	const settingsStore = SettingsStore.get();

	const isSelected = $derived(selection.has(mod.id));
	const hasVersionColumn = $derived(
		libraryColumnsStore.visibleColumns.some(
			(column) => column.key === 'version'
		)
	);
	const tags = $derived(libraryStore.tagsOf(mod));
	const placement = $derived(libraryStore.placementOf(mod));

	const inlineVersion = $derived(
		mod.version && !hasVersionColumn ? `v${mod.version}` : null
	);

	const mark = $derived.by((): Mark | null => {
		if (mod.isMissing)
			return {
				icon: UnlinkIcon,
				label: `missing · ${mod.problem}`,
				class: 'text-status-missing',
			};
		if (mod.problem)
			return {
				icon: CircleAlertIcon,
				label: mod.problem,
				class: 'text-status-missing',
			};
		if (mod.hasUpdate)
			return {
				icon: CircleArrowUpIcon,
				label: 'new version',
				class: 'text-status-update',
			};
		return null;
	});

	const profileNames = $derived(
		placement.profiles.map(({ profile, isEnabled }) =>
			isEnabled ? profile.name : `${profile.name} (off)`
		)
	);
	const firstGroup = $derived(placement.groups[0] ?? null);
</script>

{#snippet cell(key: LibraryColumn)}
	{#if key === 'mod'}
		{@const coverSize = libraryColumnsStore.coverSize}
		{#if coverSize !== 'none'}
			<ModCover {mod} size={coverSize} />
		{/if}
		<span class="flex min-w-0 items-center gap-2">
			<span
				data-cell
				class={cn(
					'truncate text-md font-medium text-foreground',
					mod.problem !== null && 'text-muted-foreground'
				)}
			>
				{mod.displayTitle}
			</span>
			{#if inlineVersion}
				<span class="shrink-0">{inlineVersion}</span>
			{/if}
			{#if mark}
				<span
					class={cn(
						'inline-flex shrink-0 items-center gap-1 text-sm font-semibold',
						mark.class
					)}
				>
					<mark.icon class="size-3.5" />
					{mark.label}
				</span>
			{/if}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Open details"
				class="ml-auto opacity-0 transition-opacity duration-120 group-hover:opacity-100 focus-visible:opacity-100"
				onclick={(event) => event.stopPropagation()}
				ondblclick={(event) => event.stopPropagation()}
			>
				<PanelRightOpenIcon />
			</Button>
		</span>
	{:else if key === 'source'}
		<ModSourceIcon
			source={mod.source}
			size={SOURCE_ICON_SIZES[libraryColumnsStore.coverSize]}
		/>
	{:else if key === 'author'}
		<span data-cell class="truncate text-sm">{mod.author_name ?? '—'}</span>
	{:else if key === 'tags'}
		<span data-cell class="flex min-w-0 gap-1.5 overflow-hidden">
			{#each tags.slice(0, SHOWN_TAGS) as tag, index (tag.id)}
				{#if index > 0}
					<span class="text-foreground-4">·</span>
				{/if}
				<span class="whitespace-nowrap">{tag.name}</span>
			{/each}
			{#if tags.length > SHOWN_TAGS}
				<span class="text-foreground-4">·</span>
				<span class="whitespace-nowrap"
					>+{tags.length - SHOWN_TAGS}</span
				>
			{/if}
		</span>
	{:else if key === 'profiles'}
		<span
			data-cell
			class="flex min-w-0 items-center gap-1.5 text-foreground-2"
		>
			{#if profileNames.length}
				<span class="truncate">
					{profileNames.slice(0, SHOWN_PROFILES).join(', ')}
				</span>
				{#if profileNames.length > SHOWN_PROFILES}
					<span class="whitespace-nowrap text-muted-foreground">
						+{profileNames.length - SHOWN_PROFILES}
					</span>
				{/if}
			{:else if firstGroup}
				<span class="inline-flex min-w-0 items-center gap-1 truncate">
					<LinkIcon class="size-3.5 shrink-0" />
					via {firstGroup.group.name} · {firstGroup.profiles.length}
					{firstGroup.profiles.length === 1 ? 'profile' : 'profiles'}
				</span>
			{/if}
		</span>
	{:else if key === 'size'}
		<span data-cell class="text-right font-mono">
			{mod.size_bytes === null || mod.isMissing
				? '—'
				: formatSize(mod.size_bytes)}
		</span>
	{:else if key === 'updated'}
		<span data-cell class="text-right font-mono">
			{mod.isMissing || !mod.updatedAt
				? '—'
				: formatDate(mod.updatedAt, settingsStore.datePattern)}
		</span>
	{:else if key === 'added'}
		<span data-cell class="text-right font-mono"
			>{mod.added_at
				? formatDate(mod.added_at, settingsStore.datePattern)
				: '—'}</span
		>
	{:else if key === 'version'}
		<span data-cell class="truncate text-sm">{mod.version ?? '—'}</span>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<li
	class={cn(
		'group grid grid-cols-(--library-columns) items-center gap-x-3 rounded-md px-5 text-xs text-muted-foreground transition-colors duration-120 select-none [content-visibility:auto] hover:bg-fill-1',
		ROW_HEIGHTS[libraryColumnsStore.coverSize],
		isSelected && 'bg-pink-tint hover:bg-pink-tint-2'
	)}
	onclick={(event) => selection.select(mod.id, event)}
	ondblclick={selectCellText}
>
	<Checkbox
		checked={isSelected}
		aria-label="Select {mod.displayTitle}"
		onclick={(event) => event.stopPropagation()}
		onCheckedChange={() => selection.toggle(mod.id)}
	/>
	{#each libraryColumnsStore.visibleColumns as column (column.key)}
		{@render cell(column.key)}
	{/each}
</li>
