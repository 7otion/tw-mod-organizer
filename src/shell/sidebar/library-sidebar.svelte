<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import TagIcon from '@lucide/svelte/icons/tag';

	import { ScrollArea } from '@/components/ui/scroll-area';

	import type { Tag } from '@/lib/models';
	import {
		LIBRARY_SOURCES,
		LibraryFilterStore,
		LibraryStore,
		MOD_STATES,
		TagsStore,
		type LibrarySource,
		type ModState,
	} from '@/lib/store';
	import { cn } from '@/lib/utils';

	import DeleteTagDialog from './delete-tag-dialog.svelte';
	import ManageTagsDialog from './manage-tags-dialog.svelte';
	import SidebarAction from './sidebar-action.svelte';
	import SidebarCount from './sidebar-count.svelte';
	import SidebarDivider from './sidebar-divider.svelte';
	import SidebarHeadingAction from './sidebar-heading-action.svelte';
	import SidebarHeading from './sidebar-heading.svelte';
	import SidebarItem from './sidebar-item.svelte';
	import TagFacet from './tag-facet.svelte';

	const SOURCE_NAMES: Record<LibrarySource, string> = {
		steam: 'Steam Workshop',
		nexus: 'Nexus Mods',
		manual: 'Manual',
	};

	const STATE_NAMES: Record<ModState, string> = {
		'in-no-profile': 'In no profile',
		'update-available': 'Update available',
		'missing-or-broken': 'Missing or broken',
	};

	const DOWNLOADING_COUNT = 1;

	const STATE_CLASSES: Record<ModState, string | undefined> = {
		'in-no-profile': undefined,
		'update-available': 'text-status-update',
		'missing-or-broken': 'text-status-missing',
	};

	const libraryStore = LibraryStore.get();
	const libraryFilterStore = LibraryFilterStore.get();
	const tagsStore = TagsStore.get();

	let isManagingTags = $state(false);
	let deleting = $state<Tag | null>(null);
</script>

{#snippet dot(isPressed: boolean)}
	<span
		class={cn(
			'size-2 shrink-0 rounded-full',
			isPressed ? 'bg-pink' : 'shadow-[inset_0_0_0_1.5px_var(--text-4)]'
		)}
	></span>
{/snippet}

{#snippet stateItem(state: ModState)}
	{@const isPressed = libraryFilterStore.states.includes(state)}
	<SidebarItem
		active={isPressed}
		onclick={() => libraryFilterStore.toggleState(state)}
	>
		{@render dot(isPressed)}
		<span class={cn('min-w-0 flex-1 truncate', STATE_CLASSES[state])}>
			{STATE_NAMES[state]}
		</span>
		<SidebarCount value={libraryFilterStore.stateCounts[state]} />
	</SidebarItem>
{/snippet}

<div class="flex flex-col pt-4 pb-1.5">
	<SidebarHeading title="SOURCE">
		{#if libraryFilterStore.sources.length}
			<SidebarHeadingAction
				onclick={() => libraryFilterStore.clearSources()}
			>
				Clear
			</SidebarHeadingAction>
		{/if}
	</SidebarHeading>
	<ul class="flex flex-col gap-px">
		{#each LIBRARY_SOURCES as source (source)}
			{@const isPressed = libraryFilterStore.sources.includes(source)}
			<SidebarItem
				active={isPressed}
				onclick={() => libraryFilterStore.toggleSource(source)}
			>
				{@render dot(isPressed)}
				<span class="min-w-0 flex-1 truncate"
					>{SOURCE_NAMES[source]}</span
				>
				<SidebarCount value={libraryFilterStore.sourceCounts[source]} />
			</SidebarItem>
		{/each}
	</ul>
</div>
<SidebarDivider />
<div class="flex flex-col pt-4 pb-1.5">
	<SidebarHeading title="STATE">
		{#if libraryFilterStore.states.length}
			<SidebarHeadingAction
				onclick={() => libraryFilterStore.clearStates()}
			>
				Clear
			</SidebarHeadingAction>
		{/if}
	</SidebarHeading>
	<ul class="flex flex-col gap-px">
		{#each MOD_STATES as state (state)}
			{@render stateItem(state)}
			{#if state === 'update-available'}
				<SidebarItem>
					{@render dot(false)}
					<span class="min-w-0 flex-1 truncate">Downloading</span>
					<SidebarCount value={DOWNLOADING_COUNT} />
				</SidebarItem>
			{/if}
		{/each}
	</ul>
</div>
<SidebarDivider />
<div class="flex min-h-0 flex-1 flex-col pt-4 pb-1.5">
	<SidebarHeading title="TAGS">
		{#if libraryFilterStore.tagIds.length}
			<SidebarHeadingAction
				onclick={() => libraryFilterStore.clearTags()}
			>
				Clear
			</SidebarHeadingAction>
		{/if}
		<SidebarHeadingAction
			tooltip="New tag"
			onclick={() => (isManagingTags = true)}
		>
			<PlusIcon class="size-3.5" />
			New
		</SidebarHeadingAction>
	</SidebarHeading>
	<ScrollArea class="min-h-0 flex-1">
		<ul class="flex flex-col gap-px">
			{#each tagsStore.list as tag (tag.id)}
				<TagFacet {tag} ondelete={() => (deleting = tag)} />
			{:else}
				<li class="px-4 text-sm text-muted-foreground">No tags yet.</li>
			{/each}
		</ul>
	</ScrollArea>
</div>
<div class="flex flex-col gap-0.5 border-t border-line py-3">
	<SidebarAction icon={TagIcon} onclick={() => (isManagingTags = true)}>
		Manage tags…
	</SidebarAction>
	<SidebarAction
		icon={RefreshCwIcon}
		disabled={libraryStore.isScanning}
		onclick={() => libraryStore.scan()}
	>
		Rescan library
	</SidebarAction>
</div>

<ManageTagsDialog bind:open={isManagingTags} />
<DeleteTagDialog bind:tag={deleting} />
