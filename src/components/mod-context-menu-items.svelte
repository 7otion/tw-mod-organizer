<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { toast } from 'svelte-sonner';

	import * as ContextMenu from '@/components/ui/context-menu';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore, SettingsStore } from '@/lib/store';

	type Props = {
		mod?: Mod;
		steamRef?: string;
	};

	const STEAM_PAGE =
		'https://steamcommunity.com/sharedfiles/filedetails/?id=';

	let { mod, steamRef }: Props = $props();

	const libraryStore = LibraryStore.get();
	const settingsStore = SettingsStore.get();

	const steamId = $derived(
		mod
			? mod.source === 'steam'
				? mod.source_ref
				: null
			: (steamRef ?? null)
	);
	const pageUrl = $derived(
		mod ? mod.page_url : steamRef ? `${STEAM_PAGE}${steamRef}` : null
	);
	const hasRpfm = $derived(Boolean(settingsStore.current?.rpfm_path));
	const canOpenPack = $derived(
		mod !== undefined &&
			mod.folder !== null &&
			mod.game_ref !== null &&
			!mod.isMissing
	);

	async function copySteamId(): Promise<void> {
		await navigator.clipboard.writeText(steamId!);
		toast.success(t('modDetails.menu.steamIdCopied'));
	}
</script>

{#if mod}
	<ContextMenu.Item
		disabled={!mod.folder || mod.isMissing}
		onSelect={() => libraryStore.openFolder(mod!)}
	>
		{t('modDetails.actions.openFolder')}
	</ContextMenu.Item>
{/if}
{#if steamId}
	<ContextMenu.Item
		onSelect={() => openUrl(`steam://url/CommunityFilePage/${steamId}`)}
	>
		{t('modDetails.actions.openInSteam')}
	</ContextMenu.Item>
{/if}
{#if mod}
	<ContextMenu.Item
		disabled={!hasRpfm || !canOpenPack}
		onSelect={() => libraryStore.openInRpfm(mod!)}
	>
		{t('modDetails.actions.rpfm')}
	</ContextMenu.Item>
{/if}
<ContextMenu.Item
	disabled={!pageUrl}
	onSelect={() => pageUrl && openUrl(pageUrl)}
>
	{t('modDetails.actions.browser')}
</ContextMenu.Item>
{#if steamId}
	<ContextMenu.Separator />
	<ContextMenu.Item onSelect={copySteamId}>
		{t('modDetails.menu.copySteamId')}
	</ContextMenu.Item>
{/if}
