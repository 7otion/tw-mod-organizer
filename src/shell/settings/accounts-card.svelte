<script lang="ts">
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';
	import { Progress } from '@/components/ui/progress';

	import { t } from '@/lib/i18n';
	import { S7forgeStore, SettingsStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const NEXUS_ACCOUNT = 'ar3_modder';

	const s7forgeStore = S7forgeStore.get();
	const settingsStore = SettingsStore.get();

	const steam = $derived(settingsStore.steamStatus);

	$effect(() => {
		settingsStore.refreshSteamStatus();
	});

	const updatePercent = $derived(
		s7forgeStore.downloadProgress
			? (s7forgeStore.downloadProgress.received /
					s7forgeStore.downloadProgress.total) *
					100
			: 0
	);

	function update(): void {
		s7forgeStore.install();
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{t('settings.sections.accounts')}</Card.Title>
	</Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="Steam"
			titleClass="text-blue-400"
			description={t('settings.accounts.steam.description')}
		>
			{#if !steam}
				<span class="text-xs text-muted-foreground">
					{t('settings.accounts.steam.checking')}
				</span>
			{:else if steam.is_running}
				<span
					class="inline-flex items-center gap-1.5 text-xs font-semibold text-status-ok"
				>
					<CircleCheckIcon class="size-3.5" />
					{t('settings.accounts.steam.running')}
				</span>
			{:else}
				<span class="text-xs font-semibold text-muted-foreground">
					{steam.is_installed
						? t('settings.accounts.steam.notRunning')
						: t('settings.accounts.steam.notFound')}
				</span>
			{/if}
		</SettingRow>
		<SettingRow
			title="Nexus Mods"
			titleClass="text-orange-400"
			description={t('settings.accounts.nexus.account', {
				name: NEXUS_ACCOUNT,
			})}
		>
			<Button variant="ghost" size="sm">
				<LogOutIcon />
				{t('settings.accounts.nexus.disconnect')}
			</Button>
		</SettingRow>
		<SettingRow
			title="s7forge"
			description={t('settings.accounts.s7forge.description')}
		>
			<div class="flex items-center gap-3">
				{#if s7forgeStore.isInstalling}
					<Progress value={updatePercent} class="w-32" />
					<span
						class="text-xs whitespace-nowrap text-muted-foreground"
					>
						{t('settings.accounts.s7forge.updating')}
					</span>
				{:else}
					<span class="font-mono text-sm text-foreground-2">
						v{s7forgeStore.version}
					</span>
					{#if s7forgeStore.hasUpdate}
						<Button variant="secondary" size="sm" onclick={update}>
							<DownloadIcon />
							{t('settings.accounts.s7forge.updateTo', {
								version: s7forgeStore.latestVersion ?? '',
							})}
						</Button>
					{/if}
				{/if}
			</div>
		</SettingRow>
	</Card.Content>
</Card.Root>
