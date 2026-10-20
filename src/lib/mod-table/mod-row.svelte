<script lang="ts" generics="Row, ScrollKey">
	import type { LucideIcon } from '@lucide/svelte';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleArrowUpIcon from '@lucide/svelte/icons/circle-arrow-up';
	import LinkIcon from '@lucide/svelte/icons/link';
	import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open';
	import PuzzleIcon from '@lucide/svelte/icons/puzzle';
	import UnlinkIcon from '@lucide/svelte/icons/unlink';

	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';

	import { formatDate, formatSize, problemText, t } from '@/lib/i18n';
	import { selectCellText } from '@/lib/select-cell-text';
	import { LibraryStore } from '@/lib/store';
	import { tagTextColor } from '@/lib/tag-swatches';
	import { cn } from '@/lib/utils';

	import { SOURCE_ICON_SIZES, type ModColumn } from './mod-columns';
	import ModCover from './mod-cover.svelte';
	import ModSourceIcon from './mod-source-icon.svelte';
	import type { ModTable } from './mod-table-state.svelte';

	type Props = {
		table: ModTable<Row, ScrollKey>;
		row: Row;
		top: number;
	};

	type Mark = {
		icon: LucideIcon;
		label: string;
		class: string;
	};

	const SHOWN_TAGS = 2;
	const SHOWN_PROFILES = 2;

	let { table, row, top }: Props = $props();

	const libraryStore = LibraryStore.get();

	const mod = $derived(table.modOf(row));
	const key = $derived(table.keyOf(row));
	const isSelected = $derived(table.selection?.has(key) ?? false);
	const hasVersionColumn = $derived(
		table.layout.visibleColumns.some((column) => column.key === 'version')
	);
	const tags = $derived(libraryStore.tagsOf(mod));
	const placement = $derived(libraryStore.placementOf(mod));

	const inlineVersion = $derived(
		mod.version && !hasVersionColumn
			? t('modTable.row.version', { version: mod.version })
			: null
	);

	const mark = $derived.by((): Mark | null => {
		if (mod.isMissing)
			return {
				icon: UnlinkIcon,
				label: t('modTable.row.missing', {
					problem: problemText(mod.problem!),
				}),
				class: 'text-status-missing',
			};
		if (mod.problem)
			return {
				icon: CircleAlertIcon,
				label: problemText(mod.problem),
				class: 'text-status-missing',
			};
		const missing = libraryStore.missingRequirementsOf(mod);
		if (missing.length) {
			const title =
				missing[0].required_title ??
				t('modDetails.dependencies.unknownTitle', {
					id: missing[0].required_ref,
				});
			return {
				icon: PuzzleIcon,
				label:
					missing.length > 1
						? t('modTable.row.needsMore', {
								title,
								count: missing.length - 1,
							})
						: t('modTable.row.needs', { title }),
				class: 'text-status-dep',
			};
		}
		if (mod.hasUnseenUpdate)
			return {
				icon: CircleArrowUpIcon,
				label: t('modTable.row.newVersion'),
				class: 'text-status-update',
			};
		return null;
	});

	const profileNames = $derived(
		placement.profiles.map(({ profile, isEnabled }) =>
			isEnabled
				? profile.name
				: t('modTable.row.profileOff', { name: profile.name })
		)
	);
	const firstGroup = $derived(placement.groups[0] ?? null);
</script>

{#snippet cell(column: ModColumn)}
	{#if column === 'mod'}
		{@const coverSize = table.layout.coverSize}
		{#if coverSize !== 'none'}
			<ModCover {mod} size={coverSize} />
		{/if}
		<span class="flex min-w-0 items-center gap-2">
			<span
				data-cell
				class={cn(
					'truncate font-medium text-foreground',
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
						'inline-flex shrink-0 items-center gap-1 font-semibold',
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
				aria-label={t('modTable.row.openDetails')}
				class="ml-auto opacity-0 transition-opacity duration-120 group-hover:opacity-100 focus-visible:opacity-100"
				onclick={(event) => {
					event.stopPropagation();
					table.openDetails(mod);
				}}
				ondblclick={(event) => event.stopPropagation()}
			>
				<PanelRightOpenIcon />
			</Button>
		</span>
	{:else if column === 'source'}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="grid place-items-center"
			ondblclick={(event) => {
				if (mod.source !== 'steam') return;
				event.stopPropagation();
				void libraryStore.openInSteam(mod);
			}}
		>
			<ModSourceIcon
				source={mod.source}
				size={SOURCE_ICON_SIZES[table.layout.coverSize]}
			/>
		</span>
	{:else if column === 'author'}
		<span data-cell class="truncate">{mod.author_name ?? '—'}</span>
	{:else if column === 'tags'}
		<span data-cell class="flex min-w-0 gap-1.5 overflow-hidden">
			{#each tags.slice(0, SHOWN_TAGS) as tag, index (tag.id)}
				{#if index > 0}
					<span class="text-foreground-4">·</span>
				{/if}
				<span
					class="whitespace-nowrap"
					style:color={tagTextColor(tag.color)}
				>
					{tag.name}
				</span>
			{/each}
			{#if tags.length > SHOWN_TAGS}
				<span class="text-foreground-4">·</span>
				<span class="whitespace-nowrap"
					>+{tags.length - SHOWN_TAGS}</span
				>
			{/if}
		</span>
	{:else if column === 'profiles'}
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
					{t('modTable.row.viaGroup', {
						group: firstGroup.group.name,
						count: firstGroup.profiles.length,
					})}
				</span>
			{/if}
		</span>
	{:else if column === 'size'}
		<span data-cell class="text-right font-mono">
			{mod.size_bytes === null || mod.isMissing
				? '—'
				: formatSize(mod.size_bytes)}
		</span>
	{:else if column === 'updated'}
		<span data-cell class="text-right font-mono">
			{mod.isMissing || !mod.updatedAt ? '—' : formatDate(mod.updatedAt)}
		</span>
	{:else if column === 'added'}
		<span data-cell class="text-right font-mono"
			>{mod.added_at ? formatDate(mod.added_at) : '—'}</span
		>
	{:else if column === 'version'}
		<span data-cell class="truncate">{mod.version ?? '—'}</span>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<li
	class={cn(
		'group absolute inset-x-6 top-0 grid grid-cols-(--table-columns) items-center gap-x-3 rounded-md px-5 text-sm text-muted-foreground transition-colors duration-120 select-none hover:bg-fill-1',
		isSelected && 'bg-pink-tint hover:bg-pink-tint-2',
		table.layout.hasRowDivider &&
			'after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-border'
	)}
	style:height="{table.rowHeight}px"
	style:transform="translateY({top}px)"
	onclick={(event) => table.selection?.select(key, event)}
	ondblclick={selectCellText}
>
	{#if table.selection}
		<Checkbox
			checked={isSelected}
			aria-label={t('common.selectItem', { name: mod.displayTitle })}
			onclick={(event) => event.stopPropagation()}
			onCheckedChange={() => table.selection!.toggle(key)}
		/>
	{/if}
	{#each table.layout.visibleColumns as column (column.key)}
		{@render cell(column.key)}
	{/each}
</li>
