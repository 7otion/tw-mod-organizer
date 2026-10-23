<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	import NexusConnectDialog from '@/components/nexus-connect-dialog.svelte';
	import { Button } from '@/components/ui/button';
	import * as InputGroup from '@/components/ui/input-group';
	import { Kbd } from '@/components/ui/kbd';
	import { Progress } from '@/components/ui/progress';

	import { formatSize, formatWhen, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import type { Download } from '@/lib/models';
	import { NexusDownloadsStore, NexusStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	const downloadsStore = NexusDownloadsStore.get();
	const nexusStore = NexusStore.get();

	let search = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let isConnecting = $state(false);

	const query = $derived(search.trim().toLowerCase());
	const rows = $derived(
		downloadsStore.shown.filter(
			(download) =>
				!query ||
				download.title.toLowerCase().includes(query) ||
				download.file_name.toLowerCase().includes(query)
		)
	);

	function percentOf(download: Download): number {
		const { received, total } = downloadsStore.transferOf(download);
		return total ? Math.min(100, Math.floor((received / total) * 100)) : 0;
	}

	function bytesOf(download: Download): string {
		const { received, total } = downloadsStore.transferOf(download);
		return total
			? t('downloads.status.bytes', {
					received: formatSize(received),
					total: formatSize(total),
				})
			: formatSize(received);
	}

	function leftOf(download: Download): string | null {
		const speed = downloadsStore.speed;
		const { received, total } = downloadsStore.transferOf(download);
		if (!speed || !total) return null;
		const seconds = Math.max(0, Math.round((total - received) / speed));
		return t('downloads.status.left', {
			speed: formatSize(speed),
			left:
				seconds >= 60
					? `${Math.round(seconds / 60)} min`
					: `${seconds} s`,
		});
	}

	function metaOf(download: Download): string {
		const parts = [];
		if (download.version) parts.push(`v${download.version}`);
		if (download.total_bytes) parts.push(formatSize(download.total_bytes));
		parts.push(download.file_name);
		return parts.join(' · ');
	}

	function onkeydown(event: KeyboardEvent): void {
		if (event.ctrlKey && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			searchInput?.focus();
		}
	}

	function run(task: Promise<void>): void {
		task.catch(toastError);
	}
</script>

<svelte:window {onkeydown} />

{#snippet bold(text: string)}
	<b class="font-semibold text-foreground">{text}</b>
{/snippet}

{#snippet statusLine(download: Download)}
	{@const percent = percentOf(download)}
	{#if download.status === 'downloading'}
		<span
			class="flex items-center gap-1.5 font-semibold text-status-update"
		>
			<DownloadIcon class="size-3.5" />
			{t('downloads.status.downloading', { percent })}
		</span>
		<Progress value={percent} class="h-1" />
		<span class="font-mono text-muted-foreground">
			{bytesOf(download)}{#if leftOf(download)}
				· {leftOf(download)}{/if}
		</span>
	{:else if download.status === 'queued'}
		<span class="flex items-center gap-1.5 font-semibold text-foreground-2">
			<ClockIcon class="size-3.5" />
			{downloadsStore.isNext(download)
				? t('downloads.status.queuedNext')
				: t('downloads.status.queued')}
		</span>
	{:else if download.status === 'paused'}
		<span class="flex items-center gap-1.5 font-semibold text-status-win">
			<PauseIcon class="size-3.5" />
			{t('downloads.status.paused', { percent })}
		</span>
		<Progress value={percent} class="h-1 opacity-60" />
		<span class="font-mono text-muted-foreground">{bytesOf(download)}</span>
	{:else if download.status === 'failed'}
		<span
			class="flex items-center gap-1.5 font-semibold text-status-missing"
		>
			<CircleXIcon class="size-3.5" />
			{t('downloads.status.failed')}
		</span>
		<span class="text-muted-foreground">{download.error}</span>
	{:else if !downloadsStore.isInstalled(download)}
		<span class="flex items-center gap-1.5 font-semibold text-status-ok">
			<CircleCheckIcon class="size-3.5" />
			{t('downloads.status.completed')}
		</span>
		{#if download.completed_at}
			<span class="font-mono text-muted-foreground">
				{formatWhen(download.completed_at)}
			</span>
		{/if}
	{:else}
		<span class="flex items-center gap-1.5 font-semibold text-foreground-2">
			<CheckIcon class="size-3.5" />
			{t('downloads.status.installed')}
		</span>
		{#if download.completed_at}
			<span class="font-mono text-muted-foreground">
				{formatWhen(download.completed_at)}
			</span>
		{/if}
	{/if}
{/snippet}

{#snippet actions(download: Download)}
	{#if download.hidden}
		<Button
			variant="ghost"
			size="sm"
			onclick={() => run(downloadsStore.setHidden(download, false))}
		>
			<EyeIcon />
			{t('downloads.actions.show')}
		</Button>
	{:else if download.status === 'downloading'}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => run(downloadsStore.pause(download))}
		>
			<PauseIcon />
			{t('downloads.actions.pause')}
		</Button>
	{:else if download.status === 'paused'}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => run(downloadsStore.resume(download))}
		>
			<PlayIcon />
			{t('downloads.actions.resume')}
		</Button>
	{:else if download.status === 'failed'}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => download.page_url && openUrl(download.page_url)}
		>
			<ExternalLinkIcon />
			{t('downloads.actions.openOnNexus')}
		</Button>
		<Button
			variant="ghost"
			size="sm"
			onclick={() => run(downloadsStore.resume(download))}
		>
			{t('downloads.actions.retry')}
		</Button>
	{:else if download.status === 'completed'}
		{#if !downloadsStore.isInstalled(download)}
			<Button
				variant="pink"
				size="sm"
				onclick={() => downloadsStore.install(download)}
			>
				<PackageIcon />
				{t('downloads.actions.install')}
			</Button>
		{/if}
		<Button
			variant="ghost"
			size="sm"
			onclick={() => run(downloadsStore.setHidden(download, true))}
		>
			<EyeOffIcon />
			{t('downloads.actions.hide')}
		</Button>
	{/if}
	{#if download.status !== 'completed' || download.hidden}
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={t('downloads.actions.remove')}
			onclick={() => run(downloadsStore.remove(download))}
		>
			<XIcon />
		</Button>
	{/if}
{/snippet}

<div class="relative flex min-h-0 flex-1 flex-col">
	<div class="flex items-center gap-6 px-9 pt-7 pb-5">
		<h1
			class="font-blackletter text-title leading-none font-medium [text-box:trim-both_cap_alphabetic]"
		>
			{t('downloads.title')}
		</h1>
		<p
			class="flex items-center gap-4 text-md font-medium text-muted-foreground"
		>
			<span>
				<Message
					key="downloads.stats.active"
					values={{ count: downloadsStore.active.length }}
				>
					{#snippet value(text)}
						{@render bold(text)}
					{/snippet}
				</Message>
			</span>
			{#if downloadsStore.speed}
				<span>
					<Message
						key="downloads.stats.speed"
						values={{ speed: formatSize(downloadsStore.speed) }}
					>
						{#snippet value(text)}
							{@render bold(text)}
						{/snippet}
					</Message>
				</span>
			{/if}
			<span>
				<Message
					key="downloads.stats.ready"
					values={{ count: downloadsStore.ready.length }}
				>
					{#snippet value(text)}
						{@render bold(text)}
					{/snippet}
				</Message>
			</span>
		</p>
		<InputGroup.Root class="ml-4 flex-1">
			<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
			<InputGroup.Input
				type="search"
				placeholder={t('downloads.search')}
				aria-label={t('downloads.search')}
				bind:ref={searchInput}
				bind:value={search}
			/>
			<InputGroup.Addon align="inline-end"
				><Kbd>{t('shortcuts.ctrl', { key: 'F' })}</Kbd
				></InputGroup.Addon
			>
		</InputGroup.Root>
	</div>
	<p class="px-9 pb-3 text-sm text-muted-foreground">
		{t('downloads.keptHint')}
	</p>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
		{#if rows.length}
			<div
				class="grid grid-cols-[72px_minmax(0,1fr)_240px_220px] gap-x-6 border-b border-line px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase"
			>
				<span></span>
				<span>{t('downloads.columns.file')}</span>
				<span>{t('downloads.columns.status')}</span>
				<span class="text-right">{t('downloads.columns.actions')}</span>
			</div>
			<ul>
				{#each rows as download (download.id)}
					<li
						class={[
							'grid min-h-17 grid-cols-[72px_minmax(0,1fr)_240px_220px] items-center gap-x-6 border-b border-line px-3 py-3',
							download.status === 'failed' &&
								'bg-status-missing/6',
						]}
					>
						<span
							class="h-10 w-18 overflow-hidden rounded-sm bg-fill-2"
						>
							{#if download.preview_url}
								<img
									src={download.preview_url}
									alt=""
									class="size-full object-cover"
								/>
							{/if}
						</span>
						<span class="flex min-w-0 flex-col gap-0.5">
							<b class="truncate font-semibold text-foreground"
								>{download.title}</b
							>
							<span
								class="truncate font-mono text-xs text-muted-foreground"
								>{metaOf(download)}</span
							>
						</span>
						<span class="flex flex-col gap-1.5 text-xs">
							{@render statusLine(download)}
						</span>
						<span class="flex items-center justify-end gap-2">
							{@render actions(download)}
						</span>
					</li>
				{/each}
			</ul>
		{:else if !nexusStore.isConnected}
			<div
				class="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
			>
				<p class="text-muted-foreground">
					{t('downloads.notConnected')}
				</p>
				<Button variant="pink" onclick={() => (isConnecting = true)}>
					{t('sidebar.downloads.connect')}
				</Button>
			</div>
		{:else}
			<p class="py-24 text-center text-muted-foreground">
				{t('downloads.empty')}
			</p>
		{/if}
	</div>
</div>

<NexusConnectDialog bind:open={isConnecting} />
