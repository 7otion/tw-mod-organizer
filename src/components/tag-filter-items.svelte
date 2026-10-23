<script lang="ts">
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import { TagsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	type Props = {
		isSelected: (tagId: number) => boolean;
		ontoggle: (tagId: number) => void;
	};

	let { isSelected, ontoggle }: Props = $props();

	const tagsStore = TagsStore.get();
</script>

{#each tagsStore.list as tag (tag.id)}
	<DropdownMenu.CheckboxItem
		checked={isSelected(tag.id)}
		closeOnSelect={false}
		onCheckedChange={() => ontoggle(tag.id)}
	>
		<span
			class="size-2 shrink-0 rounded-full"
			style:background-color={tagColor(tag.color)}
		></span>
		{tag.name}
	</DropdownMenu.CheckboxItem>
{:else}
	<DropdownMenu.Item disabled>{t('common.noTags')}</DropdownMenu.Item>
{/each}
