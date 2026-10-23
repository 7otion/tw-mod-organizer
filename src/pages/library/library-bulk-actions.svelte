<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import TagIcon from '@lucide/svelte/icons/tag';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import AddToGroupMenu from '@/components/add-to-group-menu.svelte';
	import AddToProfileMenu from '@/components/add-to-profile-menu.svelte';
	import NewTagDialog from '@/components/new-tag-dialog.svelte';
	import RemoveModsDialog from '@/components/remove-mods-dialog.svelte';
	import TagChecklistItems from '@/components/tag-checklist-items.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import type { Selection } from '@/lib/selection.svelte';
	import { LibraryStore } from '@/lib/store';

	let { selection }: { selection: Selection<number> } = $props();

	const libraryStore = LibraryStore.get();

	let isCreatingTag = $state(false);
	let isRemoving = $state(false);

	const mods = $derived(
		libraryStore.list.filter((mod) => selection.has(mod.id))
	);
	const isSteamOnly = $derived(
		mods.length > 0 && mods.every((mod) => mod.source === 'steam')
	);
</script>

<AddToProfileMenu {mods} />
<AddToGroupMenu {mods} class="text-foreground" />
<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class="text-foreground"
			>
				<TagIcon />
				{t('common.tag')}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" class="min-w-48">
		<TagChecklistItems
			{mods}
			menu="dropdown"
			onnewtag={() => (isCreatingTag = true)}
		/>
	</DropdownMenu.Content>
</DropdownMenu.Root>
<span class="mx-1 h-4.5 w-px bg-white/8"></span>
<Button
	variant="destructive-outline"
	size="sm"
	onclick={() => (isRemoving = true)}
>
	<Trash2Icon />
	{isSteamOnly ? t('library.bulk.unsubscribe') : t('library.bulk.remove')}
</Button>

<NewTagDialog bind:open={isCreatingTag} {mods} />
<RemoveModsDialog
	bind:open={isRemoving}
	{mods}
	onremoved={() => selection.clear()}
/>
