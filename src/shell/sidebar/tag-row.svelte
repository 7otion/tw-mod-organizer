<script lang="ts">
	import { Count } from '@7otion-tauri/orm';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import { Button } from '@/components/ui/button';
	import { Input } from '@/components/ui/input';
	import * as Popover from '@/components/ui/popover';

	import { t } from '@/lib/i18n';
	import { isTagPreset, ModTag, type Tag, type TagColor } from '@/lib/models';
	import { TagsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	import TagColorPicker from './tag-color-picker.svelte';
	import { nameError } from '@/lib/utils';

	let { tag, ondelete }: { tag: Tag; ondelete: () => void } = $props();

	const tagsStore = TagsStore.get();

	const modCount = new Count(() => ModTag.query().where('tag_id', tag.id));
	const color = $derived(tag.color ?? 'ash');

	let isPicking = $state(false);
	let isRenaming = $state(false);
	let name = $state('');
	let input = $state<HTMLInputElement | null>(null);

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
			event.stopPropagation();
			isRenaming = false;
		} else if (event.key === 'Enter' && !error) {
			isRenaming = false;
			if (name.trim() !== tag.name) await tagsStore.rename(tag, name);
		}
	}

	async function pick(option: TagColor): Promise<void> {
		await tagsStore.recolor(tag, option);
	}
</script>

<div
	class="grid min-h-row-regular grid-cols-[24px_minmax(0,1fr)_56px_28px] items-center gap-2 border-t px-2 py-1 first:border-t-0"
>
	<Popover.Root bind:open={isPicking}>
		<Popover.Trigger
			aria-label={t('tags.colourLabel', {
				colour: isTagPreset(color) ? t(`tags.colors.${color}`) : color,
			})}
			class="grid size-6 place-items-center rounded-full hover:bg-fill-2"
		>
			<span
				class="size-2.5 rounded-full"
				style:background-color={tagColor(color)}
			></span>
		</Popover.Trigger>
		<Popover.Content align="start" class="w-72 p-2">
			<TagColorPicker {color} onpick={pick} />
		</Popover.Content>
	</Popover.Root>

	{#if isRenaming}
		<div class="flex flex-col gap-1">
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
		</div>
	{:else}
		<button
			type="button"
			class="truncate text-left hover:text-foreground"
			onclick={startRename}
		>
			{tag.name}
		</button>
	{/if}

	<span class="text-center font-mono text-xs text-muted-foreground">
		{modCount.current}
	</span>
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={t('tags.delete.confirm')}
		onclick={ondelete}
	>
		<Trash2Icon />
	</Button>
</div>
