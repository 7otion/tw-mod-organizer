<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';
	import { Progress } from '@/components/ui/progress';

	import { type FolderColumn, GamesStore, SettingsStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const FOLDERS: {
		column: FolderColumn;
		title: string;
		description: string;
	}[] = [
		{
			column: 'mods_dir',
			title: 'Manual mods folder',
			description: 'Where installed archives and .pack files go',
		},
		{
			column: 'downloads_dir',
			title: 'Downloads folder',
			description: 'Nexus downloads, kept until installed or hidden',
		},
	];

	const settingsStore = SettingsStore.get();
	const gamesStore = GamesStore.get();

	const folderMove = $derived(settingsStore.folderMove);
	const game = $derived(gamesStore.current);

	async function changeGameFolder(): Promise<void> {
		if (!game) return;
		const path = await open({
			directory: true,
			defaultPath: game.installPath ?? undefined,
		});
		if (!path) return;
		await gamesStore.setFolder(game, path);
	}

	async function change(column: FolderColumn): Promise<void> {
		const to = await open({
			directory: true,
			defaultPath: settingsStore.current?.[column],
		});
		if (!to) return;
		const leftover = await settingsStore.moveFolder(column, to);
		if (leftover)
			toast.warning('Folder moved', {
				description: `The old folder couldn't go to the Recycle Bin and is still at ${leftover}.`,
			});
	}

	function megabytes(bytes: number): string {
		return (bytes / 1024 / 1024).toFixed(1);
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
	<Card.Header><Card.Title>Folders</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="Game folder"
			description={game?.row?.install_path
				? `Set by you for ${game.title}`
				: `Detected from Steam for ${game?.title}`}
		>
			<div class="flex min-w-0 items-center gap-2">
				{@render path(game?.installPath ?? '')}
				<Button
					variant="secondary"
					size="sm"
					onclick={changeGameFolder}
				>
					Change…
				</Button>
			</div>
		</SettingRow>
		{#each FOLDERS as folder (folder.column)}
			<SettingRow title={folder.title} description={folder.description}>
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
							Moving…
							{#if folderMove.total}
								{megabytes(folderMove.copied)} of
								{megabytes(folderMove.total)} MB
							{/if}
						</span>
					{:else}
						{@render path(
							settingsStore.current?.[folder.column] ?? ''
						)}
					{/if}
					<Button
						variant="secondary"
						size="sm"
						disabled={folderMove !== null}
						onclick={() => change(folder.column)}
					>
						Change…
					</Button>
				</div>
			</SettingRow>
		{/each}
	</Card.Content>
</Card.Root>
