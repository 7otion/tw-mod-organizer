<script lang="ts">
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import UserIcon from '@lucide/svelte/icons/user';

	import NexusConnectDialog from '@/components/nexus-connect-dialog.svelte';
	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import {
		DOWNLOAD_FILTERS,
		NexusDownloadsStore,
		NexusStore,
	} from '@/lib/store';

	import SidebarCount from './sidebar-count.svelte';
	import SidebarDivider from './sidebar-divider.svelte';
	import SidebarHeading from './sidebar-heading.svelte';
	import SidebarItem from './sidebar-item.svelte';

	const downloadsStore = NexusDownloadsStore.get();
	const nexusStore = NexusStore.get();

	let isConnecting = $state(false);
	let isDisconnecting = $state(false);
</script>

<div class="flex flex-col pt-4 pb-1.5">
	<SidebarHeading title={t('sidebar.downloads.show')} />
	<ul class="flex flex-col gap-px">
		{#each DOWNLOAD_FILTERS as filter (filter)}
			<SidebarItem
				active={downloadsStore.filter === filter}
				onclick={() => (downloadsStore.filter = filter)}
			>
				<span
					class={[
						'size-[7px] shrink-0 rotate-45',
						downloadsStore.filter === filter
							? 'bg-pink'
							: 'border border-muted-foreground',
					]}
				></span>
				<span
					class={[
						'min-w-0 flex-1 truncate',
						filter === 'failed' && 'text-status-missing',
					]}
				>
					{t(`downloads.filters.${filter}`)}
				</span>
				<SidebarCount value={downloadsStore.countOf(filter)} />
			</SidebarItem>
		{/each}
	</ul>
</div>
<SidebarDivider />
<div class="flex flex-col gap-3 px-4 pt-4">
	<SidebarHeading title={t('sidebar.downloads.nexus')} />
	{#if nexusStore.isConnected}
		<div class="flex items-center gap-3">
			<span
				class="grid size-8 shrink-0 place-items-center rounded-full bg-fill-2"
			>
				<UserIcon class="size-4" />
			</span>
			<span class="flex min-w-0 flex-col leading-snug">
				<b class="truncate text-md font-semibold text-foreground">
					{nexusStore.userName}
				</b>
				<span class="text-xs text-muted-foreground">
					{t('sidebar.downloads.connected')}
				</span>
			</span>
		</div>
		<p class="text-xs text-muted-foreground">
			{t('sidebar.downloads.hint')}
		</p>
		<Button
			variant="ghost"
			size="sm"
			class="self-start"
			onclick={() => (isDisconnecting = true)}
		>
			<LogOutIcon />
			{t('settings.accounts.nexus.disconnect')}
		</Button>
	{:else}
		<p class="text-xs text-muted-foreground">
			{t('sidebar.downloads.hint')}
		</p>
		<Button variant="pink" size="sm" onclick={() => (isConnecting = true)}>
			{t('sidebar.downloads.connect')}
		</Button>
	{/if}
</div>
<div class="flex-1"></div>
<p class="px-4 py-3 text-xs text-muted-foreground">
	{t('sidebar.downloads.steamHint')}
</p>

<NexusConnectDialog bind:open={isConnecting} />

<AlertDialog.Root bind:open={isDisconnecting}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('settings.accounts.nexus.disconnectConfirm.title')}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('settings.accounts.nexus.disconnectConfirm.description')}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				onclick={() => nexusStore.disconnect()}
			>
				{t('settings.accounts.nexus.disconnectConfirm.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
