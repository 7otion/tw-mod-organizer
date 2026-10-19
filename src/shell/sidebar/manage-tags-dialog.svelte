<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import { Input } from '@/components/ui/input';
	import { ScrollArea } from '@/components/ui/scroll-area';

	import type { Tag } from '@/lib/models';
	import { TagsStore } from '@/lib/store';
	import { nameError } from '@/lib/utils';

	import DeleteTagDialog from './delete-tag-dialog.svelte';
	import TagRow from './tag-row.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const tagsStore = TagsStore.get();

	let name = $state('');
	let isTouched = $state(false);
	let deleting = $state<Tag | null>(null);

	const error = $derived(nameError('tag', name, tagsStore.isNameTaken(name)));

	function reset(): void {
		name = '';
		isTouched = false;
	}

	async function add(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (error) return;
		await tagsStore.create(name);
		reset();
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
						<TagRow {tag} ondelete={() => (deleting = tag)} />
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

<DeleteTagDialog bind:tag={deleting} />
