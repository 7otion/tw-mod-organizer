<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TagIcon from '@lucide/svelte/icons/tag';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';

	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import type { Selection } from '@/lib/selection.svelte';
	import { LibraryStore, TagsStore } from '@/lib/store';
	import { TAG_SWATCHES } from '@/lib/tag-swatches';
	import { cn } from '@/lib/utils';

	import NewTagDialog from './new-tag-dialog.svelte';
	import RemoveModsDialog from './remove-mods-dialog.svelte';

	type Props = {
		selection: Selection<number>;
		ref?: HTMLElement | null;
	};

	let { selection, ref = $bindable(null) }: Props = $props();

	const libraryStore = LibraryStore.get();
	const tagsStore = TagsStore.get();

	let isCreatingTag = $state(false);
	let isRemoving = $state(false);

	const mods = $derived(
		libraryStore.list.filter((mod) => selection.has(mod.id))
	);
	const taggedCounts = $derived(
		Object.fromEntries(
			tagsStore.list.map((tag) => [
				tag.id,
				mods.filter((mod) => libraryStore.tagsOf(mod).includes(tag))
					.length,
			])
		) as Record<number, number>
	);
</script>

<div
	bind:this={ref}
	class="absolute bottom-4.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-[10px] bg-surface-2 py-1.5 pr-1.5 pl-3 whitespace-nowrap shadow-pop"
>
	<strong class="mr-2 text-sm font-semibold">
		<Message
			key="library.bulk.selected"
			values={{ count: selection.count }}
		>
			{#snippet value(text)}
				<b class="text-md text-foreground">{text}</b>
			{/snippet}
		</Message>
	</strong>
	<Button
		variant="pink"
		size="sm"
		class="bg-pink text-pink-ink hover:bg-pink-hover"
	>
		<PlusIcon />
		{t('library.bulk.addToProfile')}
		<ChevronDownIcon />
	</Button>
	<Button variant="ghost" size="sm" class="text-foreground">
		<LayersIcon />
		{t('library.bulk.addToGroup')}
		<ChevronDownIcon />
	</Button>
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
						class={cn(
							'size-2 shrink-0 rounded-full',
							TAG_SWATCHES[tag.color ?? 'ash']
						)}
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
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={t('common.clearSelection')}
		onclick={() => selection.clear()}
	>
		<XIcon />
	</Button>
</div>

<NewTagDialog bind:open={isCreatingTag} {mods} />
<RemoveModsDialog
	bind:open={isRemoving}
	{mods}
	onremoved={() => selection.clear()}
/>
