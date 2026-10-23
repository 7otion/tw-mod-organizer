<script lang="ts">
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import LocateIcon from '@lucide/svelte/icons/locate';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import ModCover from '@/lib/mod-table/mod-cover.svelte';
	import type { Mod, ModDependency } from '@/lib/models';
	import {
		GroupsStore,
		LibraryStore,
		LoadOrderStore,
		NoticesStore,
		type Notice,
	} from '@/lib/store';

	import { reason } from './notice-parts.svelte';

	type Props = {
		notice: Notice;
		isResolved: boolean;
		onremove: (mod: Mod) => void;
		onsubscribe: (requirements: readonly ModDependency[]) => void;
	};

	let { notice, isResolved, onremove, onsubscribe }: Props = $props();

	const groupsStore = GroupsStore.get();
	const libraryStore = LibraryStore.get();
	const loadOrderStore = LoadOrderStore.get();
	const noticesStore = NoticesStore.get();

	let isConfirmingMove = $state(false);

	const mod = $derived(notice.mod);
	const isSeen = $derived(isResolved && notice.category === 'steam');
	const isFixed = $derived(isResolved && notice.category !== 'steam');
	const isWorking = $derived(
		notice.category === 'missing' && noticesStore.isWorking(notice)
	);
	const rightLabel = $derived(
		notice.category === 'order'
			? t('notices.number', { number: notice.number })
			: t(`library.sources.${mod.source}`)
	);
	const moveText = $derived.by(() => {
		if (notice.category !== 'order') return '';
		const move = loadOrderStore.moveOf(notice.mod, notice.requirement);
		if (!move) return '';
		switch (move.kind) {
			case 'group':
				return t('notices.moveToFix.group', {
					group: move.group!.name,
					count: groupsStore.linkedProfiles(move.group!).length,
				});
			case 'block':
				return t('notices.moveToFix.block', {
					group: move.group!.name,
					profile: move.profile.name,
				});
			case 'entry':
				return t('notices.moveToFix.entry', {
					profile: move.profile.name,
				});
		}
	});
	const resolvedText = $derived.by(() => {
		switch (notice.category) {
			case 'missing':
				return t('notices.resolved.missing');
			case 'broken':
				return t('notices.resolved.broken');
			case 'order':
				return t('notices.resolved.order', {
					title: notice.requirement.displayTitle,
				});
			case 'steam':
				return t('notices.resolved.steam');
		}
	});
</script>

<li
	class={[
		'group/entry relative mx-0.5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-lg py-2 pr-1.5 pl-2',
		!isResolved && 'hover:bg-fill-1',
		isSeen && 'opacity-50',
		isFixed && 'bg-status-ok/9',
	]}
>
	{#if notice.category === 'steam' && !isResolved}
		<span
			class="absolute top-4 -left-px size-1.5 rounded-full bg-status-update"
		></span>
	{/if}
	<span class="mt-0.5"><ModCover {mod} size="compact" /></span>
	<span class="flex min-w-0 flex-col gap-px">
		<span class="flex items-baseline justify-between gap-1.5">
			<button
				type="button"
				class="min-w-0 cursor-pointer truncate text-sm font-semibold text-foreground decoration-foreground-4 underline-offset-3 group-hover/entry:underline hover:underline"
				onclick={() => noticesStore.openDetails(mod)}
			>
				{mod.displayTitle}
			</button>
			<span class="shrink-0 text-2xs text-foreground-4">{rightLabel}</span
			>
		</span>
		<span
			class={[
				'text-xs leading-[1.42] text-foreground-2',
				isFixed && 'text-status-ok',
			]}
		>
			{#if isResolved}
				{#if isFixed}
					<CheckIcon class="-mt-px mr-1 inline size-3.5" />
				{/if}
				{resolvedText}
			{:else if notice.category === 'missing' && isWorking}
				<Message
					key="notices.reason.subscribing"
					values={{
						title:
							notice.requirements[0].required_title ??
							notice.requirements[0].required_ref,
					}}
				>
					{#snippet value(text)}
						<b class="font-semibold text-foreground">{text}</b>
					{/snippet}
				</Message>
			{:else}
				{@render reason(notice)}
			{/if}
		</span>
		{#if !isResolved}
			<span class="flex items-center gap-1 pt-1.5">
				{#if notice.category === 'missing'}
					<Button
						variant="secondary"
						size="xs"
						class="h-6.5"
						disabled={isWorking}
						onclick={() => onsubscribe(notice.requirements)}
					>
						{#if isWorking}
							<LoaderCircleIcon class="animate-spin" />
							{t('notices.actions.subscribing')}
						{:else}
							<DownloadIcon />
							{t('notices.actions.subscribe', {
								count: notice.requirements.length,
							})}
						{/if}
					</Button>
				{:else if notice.category === 'broken'}
					{#if mod.isMissing}
						<Button
							variant="secondary"
							size="xs"
							class="h-6.5"
							onclick={() => onremove(mod)}
						>
							<Trash2Icon />
							{t('notices.actions.remove')}
						</Button>
					{:else}
						<Button
							variant="secondary"
							size="xs"
							class="h-6.5"
							onclick={() => libraryStore.openFolder(mod)}
						>
							<FolderOpenIcon />
							{t('notices.actions.openFolder')}
						</Button>
					{/if}
				{:else if notice.category === 'order'}
					<Button
						variant="secondary"
						size="xs"
						class="h-6.5"
						onclick={() => (isConfirmingMove = true)}
					>
						<ArrowUpDownIcon />
						{t('notices.actions.moveToFix')}
					</Button>
				{:else}
					<Button
						variant="secondary"
						size="xs"
						class="h-6.5"
						onclick={() => noticesStore.markSeen(mod)}
					>
						<CheckIcon />
						{t('notices.actions.seen')}
					</Button>
				{/if}
				<Button
					variant="ghost"
					size="xs"
					class="h-6.5 text-muted-foreground opacity-0 group-focus-within/entry:opacity-100 group-hover/entry:opacity-100"
					onclick={() => noticesStore.locate(notice)}
				>
					<LocateIcon />
					{t('notices.actions.showInTable')}
				</Button>
			</span>
		{/if}
	</span>
</li>

{#if notice.category === 'order'}
	<AlertDialog.Root bind:open={isConfirmingMove}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>
					{t('notices.moveToFix.title', {
						mod: mod.displayTitle,
						requirement: notice.requirement.displayTitle,
					})}
				</AlertDialog.Title>
				<AlertDialog.Description>{moveText}</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
				<AlertDialog.Action
					onclick={() =>
						loadOrderStore.moveAfter(
							notice.mod,
							notice.requirement
						)}
				>
					{t('notices.moveToFix.confirm')}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
