<script lang="ts">
	import { toast } from 'svelte-sonner';
	import type { LucideIcon } from '@lucide/svelte';
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import FileArchiveIcon from '@lucide/svelte/icons/file-archive';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import HashIcon from '@lucide/svelte/icons/hash';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	import { Button } from '@/components/ui/button';
	import * as Tooltip from '@/components/ui/tooltip';

	import { formatDate, t, timeAgo } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore } from '@/lib/store';
	import { cn } from '@/lib/utils';

	type FactKind = 'date' | 'code' | 'folder';

	let { mod }: { mod: Mod } = $props();

	const libraryStore = LibraryStore.get();

	async function copy(value: string): Promise<void> {
		await navigator.clipboard.writeText(value);
		toast.success(t('modDetails.info.copied'));
	}
</script>

{#snippet action(label: string, Icon: LucideIcon, onclick: () => void)}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon-sm"
					aria-label={label}
					{onclick}
				>
					<Icon />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>{label}</Tooltip.Content>
	</Tooltip.Root>
{/snippet}

{#snippet fact(Icon: LucideIcon, label: string, value: string, kind: FactKind)}
	<div class="group flex items-center gap-3 px-4 py-2.5 hover:bg-fill-1">
		<span
			class="grid size-9 shrink-0 place-items-center rounded-lg bg-fill-1 text-foreground-2"
		>
			<Icon class="size-4" />
		</span>
		<span class="flex min-w-0 flex-1 flex-col gap-1">
			<span class="text-md text-foreground-2">{label}</span>
			<span
				class={cn(
					'break-all text-foreground',
					kind === 'date' ? 'text-md' : 'font-mono text-sm'
				)}
			>
				{value}
			</span>
		</span>
		{#if kind !== 'date'}
			<span
				class="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-120 group-hover:opacity-100"
			>
				{#if kind === 'folder' && !mod.isMissing}
					{@render action(
						t('modDetails.actions.openFolder'),
						FolderOpenIcon,
						() => libraryStore.openFolder(mod)
					)}
				{/if}
				{@render action(t('modDetails.info.copy'), CopyIcon, () =>
					copy(value)
				)}
			</span>
		{/if}
	</div>
{/snippet}

<div class="-mx-4 flex flex-col divide-y">
	{#if mod.remote_updated_at}
		{@render fact(
			RefreshCwIcon,
			t('modDetails.info.updated'),
			mod.seen_updated_at
				? t('modDetails.info.dateWithSeen', {
						date: formatDate(mod.remote_updated_at),
						seen: formatDate(mod.seen_updated_at),
					})
				: formatDate(mod.remote_updated_at),
			'date'
		)}
	{/if}
	{#if mod.added_at}
		{@render fact(
			CalendarPlusIcon,
			mod.source === 'steam'
				? t('modDetails.info.subscribed')
				: t('modDetails.info.installed'),
			t('modDetails.info.dateWithAge', {
				date: formatDate(mod.added_at),
				age: timeAgo(mod.added_at),
			}),
			'date'
		)}
	{/if}
	{#if mod.game_ref}
		{@render fact(
			FileArchiveIcon,
			t('modDetails.info.file'),
			mod.game_ref,
			'code'
		)}
	{/if}
	{#if mod.source === 'steam'}
		{@render fact(
			HashIcon,
			t('modDetails.info.steamId'),
			mod.source_ref,
			'code'
		)}
	{/if}
	{#if mod.folder}
		{@render fact(
			FolderIcon,
			t('modDetails.info.folder'),
			mod.folder,
			'folder'
		)}
	{/if}
</div>
