<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';

	import * as Command from '@/components/ui/command';
	import * as Popover from '@/components/ui/popover';

	import { t } from '@/lib/i18n';
	import type { Mod, Tag } from '@/lib/models';
	import { LibraryStore, TagsStore } from '@/lib/store';

	let { mod }: { mod: Mod } = $props();

	const libraryStore = LibraryStore.get();
	const tagsStore = TagsStore.get();

	let isAdding = $state(false);
	let query = $state('');

	const tags = $derived(libraryStore.tagsOf(mod));
	const choices = $derived(
		tagsStore.list.filter(
			(tag) =>
				!tags.includes(tag) &&
				tag.name.toLowerCase().includes(query.trim().toLowerCase())
		)
	);
	const canCreate = $derived(
		query.trim() !== '' && !tagsStore.isNameTaken(query)
	);

	async function add(tag: Tag): Promise<void> {
		isAdding = false;
		query = '';
		await libraryStore.setTag([mod], tag, true);
	}

	async function create(): Promise<void> {
		const tag = await tagsStore.create(query);
		await add(tag);
	}
</script>

<div class="flex flex-wrap gap-1.5 px-4 pt-3">
	{#each tags as tag (tag.id)}
		<span
			class="inline-flex h-7 items-center gap-1 rounded-full bg-fill-1 pr-1.5 pl-3 text-sm font-semibold text-foreground"
		>
			{tag.name}
			<button
				type="button"
				aria-label={t('modDetails.tags.remove', { name: tag.name })}
				class="grid size-4.5 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-foreground"
				onclick={() => libraryStore.setTag([mod], tag, false)}
			>
				<XIcon class="size-3.5" />
			</button>
		</span>
	{/each}
	<Popover.Root
		bind:open={isAdding}
		onOpenChange={(open) => !open && (query = '')}
	>
		<Popover.Trigger
			class="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-fill-1 hover:text-foreground"
		>
			<PlusIcon class="size-3.5" />
			{t('modDetails.tags.add')}
		</Popover.Trigger>
		<Popover.Content align="start" class="w-64 p-0">
			<Command.Root shouldFilter={false}>
				<Command.Input
					bind:value={query}
					placeholder={t('modDetails.tags.search')}
				/>
				<Command.List>
					{#if !choices.length && !canCreate}
						<Command.Empty
							>{t('modDetails.tags.none')}</Command.Empty
						>
					{/if}
					{#each choices as tag (tag.id)}
						<Command.Item
							value={String(tag.id)}
							onSelect={() => add(tag)}
						>
							{tag.name}
						</Command.Item>
					{/each}
					{#if canCreate}
						<Command.Item value="create" onSelect={create}>
							<PlusIcon />
							{t('modDetails.tags.create', {
								name: query.trim(),
							})}
						</Command.Item>
					{/if}
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
</div>
