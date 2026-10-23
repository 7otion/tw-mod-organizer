<script lang="ts" module>
	import { buttonVariants } from '@/components/ui/button';

	const REMOVE_BUTTON = [
		buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
		'opacity-0 transition-opacity duration-120 group-hover:opacity-100 hover:text-status-missing focus-visible:opacity-100',
	].join(' ');
</script>

<script lang="ts">
	import Columns3CogIcon from '@lucide/svelte/icons/columns-3-cog';
	import InfoIcon from '@lucide/svelte/icons/info';
	import Layers2Icon from '@lucide/svelte/icons/layers-2';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';

	import ModDetailsPanel from '@/components/mod-details/mod-details-panel.svelte';
	import NoticeStrip from '@/components/notices/notice-strip.svelte';
	import TagColorPicker from '@/components/tag-color-picker.svelte';
	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import { Kbd } from '@/components/ui/kbd';
	import * as Popover from '@/components/ui/popover';

	import DeleteGroupDialog from '@/shell/sidebar/delete-group-dialog.svelte';
	import NewGroupDialog from '@/shell/sidebar/new-group-dialog.svelte';
	import RenameGroupDialog from '@/shell/sidebar/rename-group-dialog.svelte';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { ModPicker } from '@/lib/mod-picker/mod-picker-state.svelte';
	import ModPickerPanel from '@/lib/mod-picker/mod-picker.svelte';
	import { ModTable } from '@/lib/mod-table/mod-table-state.svelte';
	import ModTableView from '@/lib/mod-table/mod-table.svelte';
	import { X, icon } from '@/lib/mod-table/row-icons.svelte';
	import type { Group, Mod, TagColor } from '@/lib/models';
	import {
		GroupsStore,
		LibraryStore,
		TableLayoutStore,
		type GroupMod,
	} from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	import { GROUPS_LAYOUT } from './groups-layout';

	const groupsStore = GroupsStore.get();
	const libraryStore = LibraryStore.get();
	const tableLayoutStore = TableLayoutStore.get();

	const group = $derived(groupsStore.selected);
	const entries = $derived(group ? groupsStore.modsOf(group) : []);
	const linked = $derived(group ? groupsStore.linkedProfiles(group) : []);

	let search = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let isPicking = $state(false);
	let isCreating = $state(false);
	let renaming = $state<Group | null>(null);
	let deleting = $state<Group | null>(null);
	let removing = $state.raw<readonly Mod[]>([]);

	const query = $derived(search.trim().toLowerCase());
	const rows = $derived(
		query ? entries.filter((entry) => matches(entry.mod)) : entries
	);

	const picker = new ModPicker({
		excludeIds: () => entries.map((entry) => entry.mod.id),
		openDetails: (mod) => table.openDetails(mod),
	});

	const table = new ModTable<GroupMod>({
		layout: tableLayoutStore.layoutOf(GROUPS_LAYOUT),
		settingsTitleKey: 'groups.table.title',
		rows: () => rows,
		keyOf: (entry) => entry.mod.id,
		modOf: (entry) => entry.mod,
		isSelectable: true,
		isNumbered: true,
		rowActionsWidth: '32px',
		drag: {
			reorder: (ids) => groupsStore.reorder(group!, ids),
			accepts: () => true,
			insert: (payload, index) => insertFromPicker(payload.keys, index),
		},
	});

	function matches(mod: Mod): boolean {
		return libraryStore.searchTextOf(mod).includes(query);
	}

	async function insertFromPicker(
		keys: readonly number[],
		index: number
	): Promise<readonly number[]> {
		const target = group!;
		const present = new Set(entries.map((entry) => entry.mod.id));
		const mods = picker.modsFor(keys).filter((mod) => !present.has(mod.id));
		if (!mods.length) return [];
		const members = groupsStore.membersOf(target);
		const at =
			index < rows.length
				? members.indexOf(rows[index].member)
				: members.length;
		await groupsStore.insertMods(target, mods, at);
		return mods.map((mod) => mod.id);
	}

	function onkeydown(event: KeyboardEvent): void {
		table.handlePageKeydown(event, {
			searchInput,
			picker,
			isPicking: () => isPicking,
			closePicker: () => (isPicking = false),
			onDelete: () => askRemove(selectedMods()),
		});
	}

	function selectedMods(): Mod[] {
		return entries
			.filter((entry) => table.selection!.has(entry.mod.id))
			.map((entry) => entry.mod);
	}

	function askRemove(mods: readonly Mod[]): void {
		if (!mods.length) return;
		if (linked.length) removing = mods;
		else void remove(mods);
	}

	async function remove(mods: readonly Mod[]): Promise<void> {
		await groupsStore.removeMods(group!, mods);
	}

	async function confirmRemove(): Promise<void> {
		const mods = removing;
		removing = [];
		await remove(mods);
	}
</script>

<svelte:window {onkeydown} />

{#if !group}
	<div class="flex flex-1 flex-col items-center justify-center gap-4 pb-16">
		<span class="grid size-18 place-items-center rounded-full bg-fill-1">
			<Layers2Icon class="size-6 text-muted-foreground" />
		</span>
		<p class="text-xl font-semibold">{t('groups.noneTitle')}</p>
		<p class="max-w-md text-center">
			{t('groups.noneDescription')}
		</p>
		<Button onclick={() => (isCreating = true)}>
			<PlusIcon />
			{t('groups.newGroup')}
		</Button>
	</div>
{:else}
	<div class="relative flex min-h-0 flex-1 flex-col">
		<div class="flex items-center gap-6 px-9 pt-7 pb-5">
			<h1
				class="font-blackletter text-title leading-none font-medium [text-box:trim-both_cap_alphabetic]"
			>
				{group.name}
			</h1>
			<Button variant="ghost" onclick={() => (renaming = group)}>
				<PencilIcon />
				{t('groups.renameGroup')}
			</Button>
			<Popover.Root>
				<Popover.Trigger class={buttonVariants({ variant: 'ghost' })}>
					<span
						class="size-3 rounded-full"
						style:background-color={tagColor(group.color)}
					></span>
					{t('groups.changeColour')}
				</Popover.Trigger>
				<Popover.Content align="start" class="w-80 p-3">
					<TagColorPicker
						color={(group.color as TagColor | null) ?? 'ash'}
						onpick={(picked) => groupsStore.recolor(group, picked)}
					/>
				</Popover.Content>
			</Popover.Root>
			<Button
				variant="destructive-outline"
				onclick={() => (deleting = group)}
			>
				<Trash2Icon />
				{t('groups.deleteGroup')}
			</Button>
			<InputGroup.Root class="ml-4 flex-1">
				<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
				<InputGroup.Input
					type="search"
					placeholder={t('groups.search.placeholder', {
						count: entries.length,
					})}
					aria-label={t('groups.search.label')}
					bind:ref={searchInput}
					bind:value={search}
				/>
				<InputGroup.Addon align="inline-end"
					><Kbd>{t('shortcuts.ctrl', { key: 'F' })}</Kbd
					></InputGroup.Addon
				>
			</InputGroup.Root>
		</div>

		<div
			class="flex items-center gap-3 px-9 pb-5 text-md text-muted-foreground"
		>
			<p
				class="flex items-center gap-4 text-md font-medium text-muted-foreground"
			>
				<span>
					<Message
						key="sidebar.groups.mods"
						values={{ count: entries.length }}
					>
						{#snippet value(text)}
							<b class="font-bold text-foreground-2">{text}</b>
						{/snippet}
					</Message>
				</span>
				<span>
					{#if linked.length}
						<Message
							key="groups.linkedCount"
							values={{ count: linked.length }}
						>
							{#snippet value(text)}
								<b class="font-bold text-foreground-2">{text}</b
								>
							{/snippet}
						</Message>
					{:else}
						{t('sidebar.groups.notLinked')}
					{/if}
				</span>
			</p>
			<InfoIcon class="size-4 shrink-0 text-status-update" />
			<span class="flex-1">
				{linked.length
					? t('groups.callout', { count: linked.length })
					: t('groups.calloutUnlinked')}
			</span>
			<NoticeStrip />
			<Button
				variant="outline"
				aria-haspopup="dialog"
				onclick={() => (table.isSettingsOpen = true)}
			>
				<Columns3CogIcon />
				{t('modTable.settingsButton')}
			</Button>
			<Button
				variant="pink"
				aria-pressed={isPicking}
				onclick={() => (isPicking = !isPicking)}
			>
				<PlusIcon />
				{t('groups.addMods')}
			</Button>
		</div>

		<ModTableView {table} isEmpty={!entries.length && !isPicking}>
			{#snippet empty()}
				<p class="px-11 py-6 text-md text-muted-foreground">
					{t('groups.empty')}
				</p>
			{/snippet}
			{#snippet noRows()}
				<p class="px-11 py-6 text-md text-muted-foreground">
					{entries.length ? t('groups.noMatch') : t('groups.empty')}
				</p>
			{/snippet}
			{#snippet rowActions(entry)}
				<button
					type="button"
					class={REMOVE_BUTTON}
					aria-label={t('groups.removeFromGroup')}
					onclick={(event) => {
						event.stopPropagation();
						askRemove([entry.mod]);
					}}
				>
					{@render icon(X, 'size-4')}
				</button>
			{/snippet}
			{#snippet bulkActions()}
				<Button
					variant="destructive-outline"
					size="sm"
					onclick={() => askRemove(selectedMods())}
				>
					<XIcon />
					{t('groups.removeFromGroup')}
				</Button>
			{/snippet}
		</ModTableView>

		{#if isPicking}
			<ModPickerPanel
				{picker}
				target={{
					kind: 'group',
					name: group.name,
					linkedCount: linked.length,
				}}
				onclose={() => (isPicking = false)}
			/>
		{/if}

		{#if table.detailsMod}
			<ModDetailsPanel
				mod={table.detailsMod}
				context="library"
				onopen={(opened) => table.openDetails(opened)}
				onclose={() => table.closeDetails()}
			/>
		{/if}
	</div>
{/if}

<NewGroupDialog bind:open={isCreating} />
<RenameGroupDialog bind:group={renaming} />
<DeleteGroupDialog bind:group={deleting} />

<AlertDialog.Root
	open={removing.length > 0}
	onOpenChange={(isOpen) => !isOpen && (removing = [])}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('groups.remove.title', {
					count: removing.length,
					mod: removing[0]?.displayTitle ?? '',
					group: group?.name ?? '',
				})}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('groups.remove.description', {
					count: linked.length,
					names: linked.map((profile) => profile.name).join(', '),
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={confirmRemove}>
				{t('groups.remove.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
