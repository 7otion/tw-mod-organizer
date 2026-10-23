<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	import * as ContextMenu from '@/components/ui/context-menu';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import type { Mod, Tag } from '@/lib/models';
	import { LibraryStore, TagsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	type Props = {
		mods: readonly Mod[];
		menu: 'dropdown' | 'context';
		onnewtag?: () => void;
	};

	let { mods, menu, onnewtag }: Props = $props();

	const libraryStore = LibraryStore.get();
	const tagsStore = TagsStore.get();

	const counts = $derived(libraryStore.tagCountsOf(mods));

	function isChecked(tag: Tag): boolean {
		const count = counts[tag.id] ?? 0;
		return count > 0 && count === mods.length;
	}

	function isMixed(tag: Tag): boolean {
		const count = counts[tag.id] ?? 0;
		return count > 0 && count < mods.length;
	}
</script>

{#snippet label(tag: Tag)}
	<span
		class="size-2 shrink-0 rounded-full"
		style:background-color={tagColor(tag.color)}
	></span>
	{tag.name}
{/snippet}

{#if menu === 'dropdown'}
	{#each tagsStore.list as tag (tag.id)}
		<DropdownMenu.CheckboxItem
			checked={isChecked(tag)}
			indeterminate={isMixed(tag)}
			closeOnSelect={false}
			onCheckedChange={(isOn) => libraryStore.setTag(mods, tag, isOn)}
		>
			{@render label(tag)}
		</DropdownMenu.CheckboxItem>
	{:else}
		<DropdownMenu.Item disabled>{t('common.noTags')}</DropdownMenu.Item>
	{/each}
	{#if onnewtag}
		<DropdownMenu.Separator />
		<DropdownMenu.Item onSelect={onnewtag}>
			<PlusIcon />
			{t('library.bulk.newTag')}
		</DropdownMenu.Item>
	{/if}
{:else}
	{#each tagsStore.list as tag (tag.id)}
		<ContextMenu.CheckboxItem
			checked={isChecked(tag)}
			indeterminate={isMixed(tag)}
			closeOnSelect={false}
			onCheckedChange={(isOn) => libraryStore.setTag(mods, tag, isOn)}
		>
			{@render label(tag)}
		</ContextMenu.CheckboxItem>
	{:else}
		<ContextMenu.Item disabled>{t('common.noTags')}</ContextMenu.Item>
	{/each}
	{#if onnewtag}
		<ContextMenu.Separator />
		<ContextMenu.Item onSelect={onnewtag}>
			<PlusIcon />
			{t('library.bulk.newTag')}
		</ContextMenu.Item>
	{/if}
{/if}
