<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { readText } from '@tauri-apps/plugin-clipboard-manager';
	import { untrack } from 'svelte';

	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';
	import { ScrollArea } from '@/components/ui/scroll-area';
	import { Spinner } from '@/components/ui/spinner';

	import { formatDate, formatSize, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { parseWorkshopId } from '@/lib/steam-links';
	import { SettingsStore } from '@/lib/store';

	import { CollectionImport } from './collection-import.svelte';
	import CollectionItemRow from './collection-item-row.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const COLUMNS = '16px 28px minmax(0,1fr) 70px 110px';

	const settingsStore = SettingsStore.get();
	const importer = new CollectionImport();

	let createGroup = $state(false);

	const steamHint = $derived(
		settingsStore.steamStatus?.is_running === false
			? t('library.importCollection.steamOff')
			: t('library.importCollection.steamHint')
	);

	$effect(() => {
		if (open) untrack(() => void onOpen());
	});

	async function onOpen(): Promise<void> {
		void settingsStore.refreshSteamStatus();
		if (importer.link) return;
		const clipboard = await readText().catch(() => '');
		if (parseWorkshopId(clipboard) === null) return;
		importer.link = clipboard.trim();
		await importer.load();
	}

	function onClose(): void {
		importer.reset();
		createGroup = false;
	}

	async function load(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		await importer.load();
	}

	async function subscribe(): Promise<void> {
		await importer.subscribe();
		open = false;
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onClose()}>
	<Dialog.Content
		class="sm:max-w-[640px]"
		style="--collection-columns: {COLUMNS}"
	>
		<Dialog.Header>
			<Dialog.Title>{t('library.importCollection.title')}</Dialog.Title>
			<Dialog.Description>
				{t('library.importCollection.description')}
			</Dialog.Description>
		</Dialog.Header>

		<form class="flex flex-col gap-1.5" onsubmit={load}>
			<div class="flex gap-2">
				<Input
					bind:value={importer.link}
					placeholder={t('library.importCollection.linkPlaceholder')}
					aria-label={t('library.importCollection.linkLabel')}
					aria-invalid={importer.error !== null}
					autocomplete="off"
					spellcheck={false}
				/>
				<Button
					type="submit"
					variant="secondary"
					class="h-row-regular"
					disabled={importer.isLoading || !importer.link.trim()}
				>
					{#if importer.isLoading}
						<Spinner />
					{/if}
					{t('library.importCollection.load')}
				</Button>
			</div>
			{#if importer.error}
				<Field.Error>
					{importer.error.kind === 'other'
						? importer.error.detail
						: t(
								`library.importCollection.errors.${importer.error.kind}`
							)}
				</Field.Error>
			{/if}
		</form>

		{#if importer.collection}
			{@const collection = importer.collection}
			<div class="flex min-w-0 items-center gap-4">
				<span
					class="flex h-10 w-18 shrink-0 overflow-hidden rounded-md bg-fill-1"
				>
					{#if collection.preview_url}
						<img
							src={collection.preview_url}
							alt=""
							class="size-full object-cover object-top"
						/>
					{/if}
				</span>
				<span class="flex min-w-0 flex-col leading-snug">
					<b class="truncate font-semibold">{collection.title}</b>
					<span class="truncate text-sm text-muted-foreground">
						{t('library.importCollection.meta', {
							author: collection.author_name,
							count: collection.items.length,
							date: formatDate(
								new Date(collection.updated_at * 1000)
							),
						})}
					</span>
				</span>
			</div>

			{#if importer.rows.length}
				<div class="flex min-w-0 flex-col rounded-lg bg-tone-1">
					<div
						class="grid h-8 grid-cols-(--collection-columns) items-center gap-x-3 border-b px-2 text-sm font-semibold text-muted-foreground uppercase"
					>
						<Checkbox
							checked={importer.isAllTicked}
							indeterminate={importer.isSomeTicked}
							disabled={!importer.selectable.length}
							aria-label={t('common.selectAll')}
							onCheckedChange={() => importer.toggleAll()}
						/>
						<span></span>
						<span>{t('library.importCollection.item')}</span>
						<span class="text-right">
							{t('library.importCollection.size')}
						</span>
						<span class="text-right">
							{t('library.importCollection.status')}
						</span>
					</div>
					<ScrollArea class="max-h-[min(324px,40vh)] min-w-0">
						<ul class="flex flex-col py-1">
							{#each importer.rows as row (row.item.source_ref)}
								<CollectionItemRow
									{row}
									ontoggle={() => importer.toggle(row.item)}
								/>
							{/each}
						</ul>
					</ScrollArea>
				</div>
				<p class="flex gap-5 text-sm text-muted-foreground">
					<span>
						<Message
							key="library.importCollection.toSubscribe"
							values={{ count: importer.ticked.length }}
						>
							{#snippet value(text)}
								<b class="font-semibold text-foreground"
									>{text}</b
								>
							{/snippet}
						</Message>
					</span>
					<span>
						<Message
							key="library.importCollection.toDownload"
							values={{ size: formatSize(importer.tickedBytes) }}
						>
							{#snippet value(text)}
								<b class="font-semibold text-foreground"
									>{text}</b
								>
							{/snippet}
						</Message>
					</span>
					<span>
						<Message
							key="library.importCollection.inLibrary"
							values={{ count: importer.inLibraryCount }}
						>
							{#snippet value(text)}
								<b class="font-semibold text-foreground"
									>{text}</b
								>
							{/snippet}
						</Message>
					</span>
				</p>
				<Field.Field orientation="horizontal">
					<Checkbox
						id="collection-group"
						bind:checked={createGroup}
					/>
					<Field.Label for="collection-group" class="font-normal">
						{t('library.importCollection.createGroup', {
							title: collection.title,
						})}
					</Field.Label>
				</Field.Field>
			{:else}
				<p class="text-sm text-muted-foreground">
					{t('library.importCollection.empty')}
				</p>
			{/if}
		{/if}

		<Dialog.Footer class="items-center">
			<span class="mr-auto text-sm text-muted-foreground"
				>{steamHint}</span
			>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost"
						>{t('common.cancel')}</Button
					>
				{/snippet}
			</Dialog.Close>
			<Button
				variant="pink"
				disabled={!importer.ticked.length || importer.isSubscribing}
				onclick={subscribe}
			>
				{#if importer.isSubscribing}
					<Spinner />
				{:else}
					<LayersIcon />
				{/if}
				{t('library.importCollection.subscribeTo', {
					count: importer.ticked.length,
				})}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
