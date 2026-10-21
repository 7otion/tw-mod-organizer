<script lang="ts">
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { RestrictToElement } from '@dnd-kit/dom/modifiers';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as Dialog from '@/components/ui/dialog';
	import * as InputGroup from '@/components/ui/input-group';

	import { DragOrder } from '@/lib/drag-order.svelte';
	import { Selection } from '@/lib/selection.svelte';
	import type { Profile } from '@/lib/models';
	import { t } from '@/lib/i18n';
	import { GamesStore, ProfilesStore } from '@/lib/store';

	import DeleteProfileDialog from './delete-profile-dialog.svelte';
	import NewProfileDialog from './new-profile-dialog.svelte';
	import ProfileRow from './profile-row.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const gamesStore = GamesStore.get();
	const profilesStore = ProfilesStore.get();

	const order = new DragOrder(
		() => profilesStore.list,
		(profile) => profile.id,
		(ids) => profilesStore.reorder(ids)
	);

	let query = $state('');
	let isCreating = $state(false);
	let deleting = $state<Profile | null>(null);
	let deletingMany = $state<Profile[]>([]);
	let list = $state<HTMLUListElement | null>(null);

	const isFiltering = $derived(query.trim() !== '');
	const rows = $derived(
		isFiltering
			? profilesStore.list.filter((profile) =>
					profile.name
						.toLowerCase()
						.includes(query.trim().toLowerCase())
				)
			: order.items
	);
	const selection = new Selection(() => rows.map((row) => row.id));
	const selected = $derived(
		profilesStore.list.filter((profile) => selection.has(profile.id))
	);
	const hasActiveSelected = $derived(
		selected.some((profile) => profile === profilesStore.active)
	);

	async function cloneSelected(): Promise<void> {
		for (const profile of selected) await profilesStore.clone(profile);
	}

	async function removeMany(): Promise<void> {
		await profilesStore.deleteMany(deletingMany);
		selection.clear();
		deletingMany = [];
	}

	function reset(): void {
		query = '';
		selection.clear();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && reset()}>
	<Dialog.Content
		class="flex h-[min(680px,calc(100vh-var(--h-titlebar)-2rem))] w-[980px] flex-col sm:max-w-[calc(100%-2rem)]"
	>
		<Dialog.Header>
			<Dialog.Title>{t('profiles.manage.title')}</Dialog.Title>
			<Dialog.Description>
				{t('profiles.manage.description', {
					game: gamesStore.current!.title,
					count: profilesStore.list.length,
				})}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex items-center gap-2">
			<InputGroup.Root class="w-[260px]">
				<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
				<InputGroup.Input
					type="search"
					placeholder={t('profiles.manage.filter')}
					aria-label={t('profiles.manage.filter')}
					bind:value={query}
				/>
			</InputGroup.Root>
			<span class="flex-1"></span>
			<Button onclick={() => (isCreating = true)}>
				<PlusIcon />
				{t('profiles.manage.new')}
			</Button>
		</div>

		<div class="flex min-h-0 flex-1 flex-col">
			<div
				class="grid h-8 grid-cols-[18px_16px_minmax(0,1fr)_64px_64px_64px_104px_88px] items-center gap-x-3 border-b px-3 text-sm font-semibold"
			>
				<Checkbox
					checked={selection.isAll}
					indeterminate={selection.isSome}
					aria-label={t('common.selectAll')}
					onCheckedChange={() => selection.toggleAll()}
				/>
				<span></span>
				<span>{t('profiles.manage.columns.profile')}</span>
				<span class="text-center">
					{t('profiles.manage.columns.mods')}
				</span>
				<span class="text-center">
					{t('profiles.manage.columns.enabled')}
				</span>
				<span class="text-right">
					{t('profiles.manage.columns.groups')}
				</span>
				<span>{t('profiles.manage.columns.lastUsed')}</span>
				<span class="text-right">
					{t('profiles.manage.columns.created')}
				</span>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto">
				<ul bind:this={list} class="flex flex-col gap-px py-1">
					<DragDropProvider
						modifiers={[
							RestrictToVerticalAxis,
							RestrictToElement.configure({
								element: () => list,
							}),
						]}
						onDragOver={(event) => order.over(event)}
						onDragEnd={(event) => order.end(event.canceled)}
					>
						{#each rows as profile, index (profile.id)}
							<ProfileRow
								{profile}
								{index}
								canDrag={!isFiltering}
								{selection}
								ondelete={() => (deleting = profile)}
							/>
						{/each}
					</DragDropProvider>
				</ul>
				{#if !rows.length}
					<p class="px-3 py-6 text-md text-muted-foreground">
						{t('profiles.manage.noMatch', { query: query.trim() })}
					</p>
				{/if}
			</div>

			{#if selected.length >= 2}
				<div
					class="mb-1 flex items-center gap-1.5 self-center rounded-lg bg-surface-1 py-1.5 pr-1.5 pl-4 shadow-pop"
				>
					<b class="mr-2 text-md font-semibold">
						{t('common.selectedCount', { count: selected.length })}
					</b>
					<Button variant="ghost" size="sm" onclick={cloneSelected}>
						<CopyIcon />
						{t('common.clone')}
					</Button>
					<Button
						variant="destructive-outline"
						size="sm"
						disabled={hasActiveSelected}
						title={hasActiveSelected
							? t('profiles.manage.activeSelected')
							: undefined}
						onclick={() => (deletingMany = selected)}
					>
						<Trash2Icon />
						{t('common.deleteEllipsis')}
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
			{/if}
		</div>

		<Dialog.Footer class="items-center sm:justify-between">
			<p
				class="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
			>
				<GripVerticalIcon class="size-4" />
				{t('profiles.manage.dragHint')}
			</p>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>{t('common.done')}</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<NewProfileDialog bind:open={isCreating} />
<DeleteProfileDialog bind:profile={deleting} />

<AlertDialog.Root
	open={deletingMany.length > 0}
	onOpenChange={(isOpen) => !isOpen && (deletingMany = [])}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('profiles.deleteMany.title', { count: deletingMany.length })}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('profiles.deleteMany.description', {
					names: deletingMany
						.map((profile) => profile.name)
						.join(', '),
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={removeMany}>
				{t('profiles.deleteMany.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
