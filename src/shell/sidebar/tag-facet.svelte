<script lang="ts">
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import * as ContextMenu from '@/components/ui/context-menu';
	import { Input } from '@/components/ui/input';

	import { type Tag, TAG_COLORS, type TagColor } from '@/lib/models';
	import { LibraryFilterStore, TagsStore } from '@/lib/store';
	import { TAG_SWATCHES } from '@/lib/tag-swatches';
	import { cn, nameError } from '@/lib/utils';

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

	async function recolor(option: string): Promise<void> {
		if (option !== color) await tagsStore.recolor(tag, option as TagColor);
	}
</script>

{#snippet dot(option: TagColor)}
	<span class={cn('size-2 shrink-0 rounded-full', TAG_SWATCHES[option])}
	></span>
{/snippet}

{#if isRenaming}
	<li class="flex flex-col gap-1 px-4 py-0.5">
		<Input
			bind:ref={input}
			bind:value={name}
			aria-label="Tag name"
			aria-invalid={error !== null}
			class="h-7"
			{onkeydown}
			onblur={() => (isRenaming = false)}
		/>
		{#if error}
			<p class="text-xs text-status-missing">{error}</p>
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
					{@render dot(color)}
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
				Rename…
			</ContextMenu.Item>
			<ContextMenu.Sub>
				<ContextMenu.SubTrigger>
					<PaletteIcon />
					Change colour
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent>
					<ContextMenu.RadioGroup
						value={color}
						onValueChange={recolor}
					>
						{#each TAG_COLORS as option (option)}
							<ContextMenu.RadioItem
								value={option}
								class="capitalize"
							>
								{@render dot(option)}
								{option}
							</ContextMenu.RadioItem>
						{/each}
					</ContextMenu.RadioGroup>
				</ContextMenu.SubContent>
			</ContextMenu.Sub>
			<ContextMenu.Separator />
			<ContextMenu.Item variant="destructive" onSelect={ondelete}>
				<Trash2Icon />
				Delete…
			</ContextMenu.Item>
		</ContextMenu.Content>
	</ContextMenu.Root>
{/if}
