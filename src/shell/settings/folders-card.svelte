<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';
	import { Progress } from '@/components/ui/progress';

	import { t } from '@/lib/i18n';
	import type { MessageKey } from '@/lib/i18n/message-key';
	import { type FolderColumn, GamesStore, SettingsStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const FOLDERS: {
		column: FolderColumn;
		titleKey: MessageKey;
		descriptionKey: MessageKey;
	}[] = [
		{
			column: 'mods_dir',
			titleKey: 'settings.folders.mods.title',
			descriptionKey: 'settings.folders.mods.description',
		},
		{
			column: 'downloads_dir',
			titleKey: 'settings.folders.downloads.title',
			descriptionKey: 'settings.folders.downloads.description',
		},
	];

	type PendingChange = {
		column: FolderColumn | 'game';
		to: string;
	};

	const settingsStore = SettingsStore.get();
	const gamesStore = GamesStore.get();

	let pending = $state.raw<PendingChange | null>(null);

	const folderMove = $derived(settingsStore.folderMove);
	const game = $derived(gamesStore.current!);
	const pendingTitle = $derived.by(() => {
		if (!pending) return '';
		if (pending.column === 'game')
			return t('settings.folders.confirm.gameTitle', {
				game: game.title,
			});
		const folder = FOLDERS.find(
			(folder) => folder.column === pending!.column
		)!;
		return t('settings.folders.confirm.moveTitle', {
			folder: t(folder.titleKey),
		});
	});

	async function changeGameFolder(): Promise<void> {
		const path = await open({
			directory: true,
			defaultPath: game.installPath ?? undefined,
		});
		if (path) pending = { column: 'game', to: path };
	}

	async function change(column: FolderColumn): Promise<void> {
		const to = await open({
			directory: true,
			defaultPath: settingsStore.current![column],
		});
		if (to) pending = { column, to };
	}

	async function confirmChange(): Promise<void> {
		const change = pending!;
		pending = null;
		if (change.column === 'game') {
			await gamesStore.setFolder(game, change.to);
			return;
		}
		const leftover = await settingsStore.moveFolder(
			change.column,
			change.to
		);
		if (leftover)
			toast.warning(t('settings.folders.moved'), {
				description: t('settings.folders.leftover', { path: leftover }),
			});
	}

	function megabytes(bytes: number): number {
		return Math.round((bytes / 1024 / 1024) * 10) / 10;
	}
</script>

{#snippet path(value: string)}
	<code
		class="max-w-80 truncate rounded-sm bg-fill-1 px-2 py-1 font-mono text-xs text-foreground-2"
	>
		{value}
	</code>
{/snippet}

<Card.Root>
	<Card.Header>
		<Card.Title>{t('settings.sections.folders')}</Card.Title>
	</Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title={t('settings.folders.game.title')}
			description={game.row!.install_path
				? t('settings.folders.game.setByYou', { game: game.title })
				: t('settings.folders.game.detected', { game: game.title })}
		>
			<div class="flex min-w-0 items-center gap-2">
				{@render path(game?.installPath ?? '')}
				<Button
					variant="secondary"
					size="sm"
					onclick={changeGameFolder}
				>
					{t('common.changeEllipsis')}
				</Button>
			</div>
		</SettingRow>
		{#each FOLDERS as folder (folder.column)}
			<SettingRow
				title={t(folder.titleKey)}
				description={t(folder.descriptionKey)}
			>
				<div class="flex min-w-0 items-center gap-2">
					{#if folderMove?.column === folder.column}
						<Progress
							value={folderMove.total
								? (folderMove.copied / folderMove.total) * 100
								: 0}
							class="w-40"
						/>
						<span
							class="text-xs whitespace-nowrap text-muted-foreground"
						>
							{folderMove.total
								? t('settings.folders.movingProgress', {
										copied: megabytes(folderMove.copied),
										total: megabytes(folderMove.total),
									})
								: t('settings.folders.moving')}
						</span>
					{:else}
						{@render path(settingsStore.current![folder.column])}
					{/if}
					<Button
						variant="secondary"
						size="sm"
						disabled={folderMove !== null}
						onclick={() => change(folder.column)}
					>
						{t('common.changeEllipsis')}
					</Button>
				</div>
			</SettingRow>
		{/each}
	</Card.Content>
</Card.Root>

<AlertDialog.Root
	bind:open={
		() => pending !== null,
		(isOpen) => {
			if (!isOpen) pending = null;
		}
	}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{pendingTitle}</AlertDialog.Title>
			<AlertDialog.Description class="flex flex-col gap-2">
				{#if pending}
					{@render path(pending.to)}
					<span>
						{pending.column === 'game'
							? t('settings.folders.confirm.gameDescription')
							: t('settings.folders.confirm.moveDescription')}
					</span>
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmChange}>
				{pending?.column === 'game'
					? t('settings.folders.confirm.useFolder')
					: t('settings.folders.confirm.move')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
