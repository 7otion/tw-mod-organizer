<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';

	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore, SettingsStore } from '@/lib/store';

	let { mod }: { mod: Mod } = $props();

	const libraryStore = LibraryStore.get();
	const settingsStore = SettingsStore.get();

	const hasRpfm = $derived(Boolean(settingsStore.current?.rpfm_path));
	const canOpenPack = $derived(
		mod.folder !== null && mod.game_ref !== null && !mod.isMissing
	);
</script>

<div class="flex flex-wrap gap-1.5 pt-2">
	<Button
		variant="secondary"
		size="sm"
		disabled={!mod.folder || mod.isMissing}
		onclick={() => libraryStore.openFolder(mod)}
	>
		<FolderOpenIcon />
		{t('modDetails.actions.openFolder')}
	</Button>
	{#if mod.source === 'steam'}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => libraryStore.openInSteam(mod)}
		>
			<ExternalLinkIcon />
			{t('modDetails.actions.openInSteam')}
		</Button>
	{/if}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="secondary" size="sm">
					{t('modDetails.actions.openIn')}
					<ChevronDownIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="min-w-56">
			<DropdownMenu.Item
				disabled={!hasRpfm || !canOpenPack}
				onSelect={() => libraryStore.openInRpfm(mod)}
			>
				<span class="flex flex-col">
					{t('modDetails.actions.rpfm')}
					{#if !hasRpfm}
						<span class="text-xs text-muted-foreground">
							{t('modDetails.actions.rpfmMissing')}
						</span>
					{/if}
				</span>
			</DropdownMenu.Item>
			<DropdownMenu.Item
				disabled={!mod.page_url}
				onSelect={() => mod.page_url && openUrl(mod.page_url)}
			>
				{t('modDetails.actions.browser')}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
