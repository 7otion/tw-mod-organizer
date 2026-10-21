<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TagIcon from '@lucide/svelte/icons/tag';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import AddToGroupMenu from '@/components/add-to-group-menu.svelte';
	import RemoveModsDialog from '@/components/remove-mods-dialog.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import type { Selection } from '@/lib/selection.svelte';
	import { LibraryStore, TagsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	import NewTagDialog from './new-tag-dialog.svelte';

	let { selection }: { selection: Selection<number> } = $props();

	const libraryStore = LibraryStore.get();
	const tagsStore = TagsStore.get();

	let isCreatingTag = $state(false);
	let isRemoving = $state(false);

	const mods = $derived(
		libraryStore.list.filter((mod) => selection.has(mod.id))
	);
	const taggedCounts = $derived.by(() => {
		const counts: Record<number, number> = {};
		for (const mod of mods)
			for (const tag of libraryStore.tagsOf(mod))
				counts[tag.id] = (counts[tag.id] ?? 0) + 1;
		return counts;
	});
</script>

<Button
	variant="pink"
	size="sm"
	class="bg-pink text-pink-ink hover:bg-pink-hover"
>
	<PlusIcon />
	{t('library.bulk.addToProfile')}
	<ChevronDownIcon />
</Button>
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
				{t('library.bulk.tag')}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" class="min-w-48">
		{#each tagsStore.list as tag (tag.id)}
			{@const count = taggedCounts[tag.id] ?? 0}
			<DropdownMenu.CheckboxItem
				checked={count > 0 && count === mods.length}
				indeterminate={count > 0 && count < mods.length}
				onCheckedChange={(isChecked) =>
					libraryStore.setTag(mods, tag, isChecked)}
			>
				<span
					class="size-2 shrink-0 rounded-full"
					style:background-color={tagColor(tag.color)}
				></span>
				{tag.name}
			</DropdownMenu.CheckboxItem>
		{/each}
		{#if tagsStore.list.length}
			<DropdownMenu.Separator />
		{/if}
		<DropdownMenu.Item onSelect={() => (isCreatingTag = true)}>
			<PlusIcon />
			{t('library.bulk.newTag')}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
<span class="mx-1 h-4.5 w-px bg-white/8"></span>
<Button
	variant="destructive-outline"
	size="sm"
	onclick={() => (isRemoving = true)}
>
	<Trash2Icon />
	{t('library.bulk.remove')}
</Button>

<NewTagDialog bind:open={isCreatingTag} {mods} />
<RemoveModsDialog
	bind:open={isRemoving}
	{mods}
	onremoved={() => selection.clear()}
/>
