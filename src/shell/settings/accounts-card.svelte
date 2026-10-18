<script lang="ts">
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';
	import { Progress } from '@/components/ui/progress';

	import { S7forgeStore, SteamStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	import SettingRow from './setting-row.svelte';

	const s7forgeStore = S7forgeStore.get();
	const steamStore = SteamStore.get();

	const steam = $derived(steamStore.status);

	$effect(() => {
		steamStore.refresh().catch(toastError);
	});

	const updatePercent = $derived(
		s7forgeStore.downloadProgress
			? (s7forgeStore.downloadProgress.received /
					s7forgeStore.downloadProgress.total) *
					100
			: 0
	);

	function update(): void {
		s7forgeStore.install().catch(toastError);
	}
</script>

<Card.Root>
	<Card.Header><Card.Title>Accounts &amp; tools</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="Steam"
			titleClass="text-blue-400"
			description="Used for subscriptions, updates and launching"
		>
			{#if !steam}
				<span class="text-xs text-muted-foreground">Checking…</span>
			{:else if steam.is_running}
				<span
					class="inline-flex items-center gap-1.5 text-xs font-semibold text-status-ok"
				>
					<CircleCheckIcon class="size-3.5" />
					Running
				</span>
			{:else}
				<span class="text-xs font-semibold text-muted-foreground">
					{steam.is_installed
						? 'Installed · not running'
						: 'Not found'}
				</span>
			{/if}
		</SettingRow>
		<SettingRow
			title="Nexus Mods"
			titleClass="text-orange-400"
			description="ar3_modder · free account"
		>
			<Button variant="ghost" size="sm">
				<LogOutIcon />
				Disconnect…
			</Button>
		</SettingRow>
		<SettingRow
			title="s7forge"
			description="Talks to Steam for workshop features, without keeping your game marked as running"
		>
			<div class="flex items-center gap-3">
				{#if s7forgeStore.isInstalling}
					<Progress value={updatePercent} class="w-32" />
					<span
						class="text-xs whitespace-nowrap text-muted-foreground"
					>
						Updating…
					</span>
				{:else}
					<span class="font-mono text-sm text-foreground-2">
						v{s7forgeStore.version}
					</span>
					{#if s7forgeStore.hasUpdate}
						<Button variant="secondary" size="sm" onclick={update}>
							<DownloadIcon />
							Update to v{s7forgeStore.latestVersion}
						</Button>
					{/if}
				{/if}
			</div>
		</SettingRow>
	</Card.Content>
</Card.Root>
