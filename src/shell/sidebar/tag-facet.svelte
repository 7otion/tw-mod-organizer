<script lang="ts">
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import TagColorPicker from '@/components/tag-color-picker.svelte';
	import * as ContextMenu from '@/components/ui/context-menu';
	import * as Dialog from '@/components/ui/dialog';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import {
		isTagPreset,
		TAG_PRESETS,
		type Tag,
		type TagColor,
		type TagPreset,
	} from '@/lib/models';
	import { LibraryFilterStore, TagsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';
	import { nameError } from '@/lib/utils';

	import SidebarCount from './sidebar-count.svelte';
	import SidebarItem from './sidebar-item.svelte';

	type Props = {
		tag: Tag;
		ondelete: () => void;
	};

	let { tag, ondelete }: Props = $props();

	const libraryFilterStore = LibraryFilterStore.get();
	const tagsStore = TagsStore.get();

	let isRenaming = $state(false);
	let isPickingColor = $state(false);
	let name = $state('');
	let input = $state<HTMLInputElement | null>(null);

	const color = $derived(tag.color ?? 'ash');
	const error = $derived(
		nameError('tag', name, tagsStore.isNameTaken(name, tag))
	);

	$effect(() => {
		input?.focus();
		input?.select();
	});

	function startRename(): void {
		name = tag.name;
		isRenaming = true;
	}

	async function onkeydown(event: KeyboardEvent): Promise<void> {
		if (event.key === 'Escape') {
			event.preventDefault();
			isRenaming = false;
		} else if (event.key === 'Enter' && !error) {
			isRenaming = false;
			if (name.trim() !== tag.name) await tagsStore.rename(tag, name);
		}
	}

	async function recolor(option: TagColor): Promise<void> {
		if (option !== color) await tagsStore.recolor(tag, option);
	}
</script>

{#snippet dot(option: TagPreset)}
	<span
		class="size-2 shrink-0 rounded-full"
		style:background-color={tagColor(option)}
	></span>
{/snippet}

{#if isRenaming}
	<li class="flex flex-col gap-1 px-4 py-0.5">
		<Input
			bind:ref={input}
			bind:value={name}
			aria-label={t('tags.nameLabel')}
			aria-invalid={error !== null}
			class="h-7"
			{onkeydown}
			onblur={() => (isRenaming = false)}
		/>
		{#if error}
			<p class="text-xs text-status-missing">{t(error)}</p>
		{/if}
	</li>
{:else}
	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				<SidebarItem
					{...props}
					active={libraryFilterStore.tagIds.includes(tag.id)}
					onclick={() => libraryFilterStore.toggleTag(tag.id)}
				>
					<span
						class="size-2 shrink-0 rounded-full"
						style:background-color={tagColor(color)}
					></span>
					<span class="min-w-0 flex-1 truncate">{tag.name}</span>
					<SidebarCount
						value={libraryFilterStore.tagCounts[tag.id] ?? 0}
					/>
				</SidebarItem>
			{/snippet}
		</ContextMenu.Trigger>
		<ContextMenu.Content>
			<ContextMenu.Item onSelect={startRename}>
				<PencilIcon />
				{t('common.renameEllipsis')}
			</ContextMenu.Item>
			<ContextMenu.Sub>
				<ContextMenu.SubTrigger>
					<PaletteIcon />
					{t('tags.changeColour')}
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent>
					<ContextMenu.RadioGroup
						value={isTagPreset(color) ? color : ''}
						onValueChange={(option) => recolor(option as TagPreset)}
					>
						{#each TAG_PRESETS as option (option)}
							<ContextMenu.RadioItem value={option}>
								{@render dot(option)}
								{t(`tags.colors.${option}`)}
							</ContextMenu.RadioItem>
						{/each}
					</ContextMenu.RadioGroup>
					<ContextMenu.Separator />
					<ContextMenu.Item onSelect={() => (isPickingColor = true)}>
						<PlusIcon />
						{t('colorPicker.custom')}
					</ContextMenu.Item>
				</ContextMenu.SubContent>
			</ContextMenu.Sub>
			<ContextMenu.Separator />
			<ContextMenu.Item variant="destructive" onSelect={ondelete}>
				<Trash2Icon />
				{t('common.deleteEllipsis')}
			</ContextMenu.Item>
		</ContextMenu.Content>
	</ContextMenu.Root>
	<Dialog.Root bind:open={isPickingColor}>
		<Dialog.Content class="sm:max-w-[360px]">
			<Dialog.Header>
				<Dialog.Title>
					{t('tags.colourTitle', { name: tag.name })}
				</Dialog.Title>
			</Dialog.Header>
			<TagColorPicker {color} onpick={recolor} />
		</Dialog.Content>
	</Dialog.Root>
{/if}
