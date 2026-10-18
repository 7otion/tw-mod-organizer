<script lang="ts">
	import { Count } from '@7otion-tauri/orm';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import { Input } from '@/components/ui/input';
	import { ScrollArea } from '@/components/ui/scroll-area';

	import { ModTag, type Tag } from '@/lib/models';
	import { TagsStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	import TagRow from './tag-row.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const tagsStore = TagsStore.get();

	let name = $state('');
	let isTouched = $state(false);
	let deleting = $state<Tag | null>(null);

	const error = $derived(
		!name.trim()
			? 'A tag needs a name.'
			: tagsStore.isNameTaken(name)
				? 'A tag with this name already exists.'
				: null
	);
	const deletingCount = new Count(() =>
		ModTag.query().where('tag_id', deleting?.id ?? 0)
	);

	function reset(): void {
		name = '';
		isTouched = false;
	}

	async function add(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (error) return;
		try {
			await tagsStore.create(name);
			reset();
		} catch (error) {
			toastError(error);
		}
	}

	async function remove(): Promise<void> {
		if (!deleting) return;
		await tagsStore.delete(deleting).catch(toastError);
		deleting = null;
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && reset()}>
	<Dialog.Content class="sm:max-w-[460px]">
		<Dialog.Header>
			<Dialog.Title>Tags</Dialog.Title>
			<Dialog.Description>
				{tagsStore.list.length}
				{tagsStore.list.length === 1 ? 'tag' : 'tags'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="flex flex-col gap-1.5" onsubmit={add}>
			<div class="flex gap-2">
				<Input
					bind:value={name}
					placeholder="New tag name"
					aria-label="New tag name"
					aria-invalid={isTouched && error !== null}
					oninput={() => (isTouched = true)}
				/>
				<Button type="submit" class="h-row-regular">
					<PlusIcon />
					Add
				</Button>
			</div>
			{#if isTouched && error}
				<p class="text-xs text-status-missing">{error}</p>
			{/if}
		</form>

		{#if tagsStore.list.length}
			<div class="rounded-lg bg-card">
				<div
					class="grid grid-cols-[24px_minmax(0,1fr)_56px_28px] gap-2 border-b px-2 py-2 text-sm font-semibold text-muted-foreground"
				>
					<span></span>
					<span>Tag</span>
					<span class="text-right">Mods</span>
					<span></span>
				</div>
				<ScrollArea class="max-h-[min(360px,45vh)]">
					{#each tagsStore.list as tag (tag.id)}
						<TagRow
							{tag}
							isNameTaken={(name) =>
								tagsStore.isNameTaken(name, tag)}
							onrename={(name) => tagsStore.rename(tag, name)}
							onrecolor={(color) => tagsStore.recolor(tag, color)}
							ondelete={() => (deleting = tag)}
						/>
					{/each}
				</ScrollArea>
			</div>
		{:else}
			<p class="text-md text-muted-foreground">
				No tags yet. Tags label mods for filtering; they never change
				what a profile loads.
			</p>
		{/if}

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>Done</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
	open={deleting !== null}
	onOpenChange={(isOpen) => !isOpen && (deleting = null)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{deleting?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				It's removed from {deletingCount.current}
				{deletingCount.current === 1 ? 'mod' : 'mods'}. The mods stay in
				your library.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				Delete tag
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
