<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import Minimize2Icon from '@lucide/svelte/icons/minimize-2';
	import XIcon from '@lucide/svelte/icons/x';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Progress } from '@/components/ui/progress';
	import { ScrollArea } from '@/components/ui/scroll-area';
	import { Spinner } from '@/components/ui/spinner';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { WorkshopDownloadsStore, type WorkshopDownload } from '@/lib/store';
	import { cn } from '@/lib/utils';

	const downloadsStore = WorkshopDownloadsStore.get();

	let onlyProblems = $state(false);
	let isConfirmingStop = $state(false);

	const rows = $derived(
		onlyProblems
			? downloadsStore.items.filter((item) => isProblem(item))
			: downloadsStore.items
	);
	const timeLeft = $derived.by(() => {
		const seconds = downloadsStore.secondsLeft;
		if (seconds === null) return null;
		if (seconds < 60) return t('workshopDownloads.lessThanMinute');
		return t('workshopDownloads.minutesLeft', {
			minutes: Math.ceil(seconds / 60),
		});
	});

	function isProblem(item: WorkshopDownload): boolean {
		return (
			item.status === 'subscribe_failed' ||
			item.status === 'update_failed' ||
			item.status === 'unsubscribed'
		);
	}

	function isDone(item: WorkshopDownload): boolean {
		return (
			item.status === 'installed' ||
			item.status === 'updated' ||
			item.status === 'up_to_date'
		);
	}

	function statusText(item: WorkshopDownload): string {
		if (item.status === 'downloading' && item.total_bytes)
			return t('workshopDownloads.statuses.percent', {
				percent: Math.floor(
					(100 * item.downloaded_bytes) / item.total_bytes
				),
			});
		return t(`workshopDownloads.statuses.${item.status}`);
	}

	async function stop(): Promise<void> {
		isConfirmingStop = false;
		await downloadsStore.stop();
	}
</script>

<Dialog.Root
	bind:open={
		() => downloadsStore.isOpen,
		(isOpen) => (downloadsStore.isOpen = isOpen)
	}
>
	<Dialog.Content class="sm:max-w-[520px]" showCloseButton={false}>
		<Dialog.Header>
			<Dialog.Title>
				{downloadsStore.isFinished
					? t(`workshopDownloads.finished.${downloadsStore.kind}`)
					: t(`workshopDownloads.title.${downloadsStore.kind}`)}
			</Dialog.Title>
			<Dialog.Description>
				{t(`workshopDownloads.description.${downloadsStore.kind}`)}
			</Dialog.Description>
		</Dialog.Header>
		<Button
			variant="ghost"
			size="icon-sm"
			class="absolute top-4 right-4"
			aria-label={downloadsStore.isActive
				? t('workshopDownloads.minimise')
				: t('common.close')}
			onclick={() =>
				downloadsStore.isActive
					? (downloadsStore.isOpen = false)
					: downloadsStore.dismiss()}
		>
			{#if downloadsStore.isActive}
				<Minimize2Icon />
			{:else}
				<XIcon />
			{/if}
		</Button>

		<p class="flex items-baseline gap-2 text-sm text-muted-foreground">
			<Message
				key="workshopDownloads.done"
				values={{
					done: downloadsStore.done,
					total: downloadsStore.total,
				}}
			>
				{#snippet value(text)}
					<b class="text-xl font-semibold text-foreground">{text}</b>
				{/snippet}
			</Message>
			{#if downloadsStore.failed}
				<span>
					· {t('workshopDownloads.failed', {
						count: downloadsStore.failed,
					})}
				</span>
			{/if}
			{#if timeLeft}
				<span>· {timeLeft}</span>
			{/if}
		</p>
		<Progress
			value={downloadsStore.done + downloadsStore.failed}
			max={downloadsStore.total || 1}
		/>

		<ScrollArea
			class="max-h-[min(300px,40vh)] min-w-0 rounded-lg bg-tone-1"
		>
			<ul class="flex flex-col py-1">
				{#each rows as item (item.source_ref)}
					<li
						class={cn(
							'flex h-8 items-center gap-3 px-3 text-sm',
							item.status === 'queued' && 'text-muted-foreground'
						)}
					>
						{#if item.status === 'downloading'}
							<Spinner class="size-3.5" />
						{:else if isDone(item)}
							<CheckIcon
								class={cn(
									'size-3.5',
									item.status === 'up_to_date'
										? 'text-status-ok'
										: 'text-status-update'
								)}
							/>
						{:else if isProblem(item)}
							<XIcon class="size-3.5 text-status-missing" />
						{:else}
							<span
								class="mx-0.5 size-2.5 rounded-full border-[1.5px] border-current"
							></span>
						{/if}
						<span
							class="min-w-0 flex-1 truncate"
							title={item.error}
						>
							{item.title}
						</span>
						<span
							class={cn(
								'shrink-0 text-right font-semibold tabular-nums',
								item.status === 'up_to_date' &&
									'text-status-ok',
								(item.status === 'installed' ||
									item.status === 'updated' ||
									item.status === 'downloading') &&
									'text-status-update',
								isProblem(item) && 'text-status-missing'
							)}
						>
							{statusText(item)}
						</span>
					</li>
				{:else}
					<li class="px-3 py-2 text-sm text-muted-foreground">
						{t('workshopDownloads.noProblems')}
					</li>
				{/each}
			</ul>
		</ScrollArea>

		<Field.Field orientation="horizontal">
			<Checkbox
				id="downloads-only-problems"
				bind:checked={onlyProblems}
			/>
			<Field.Label for="downloads-only-problems" class="font-normal">
				{t('workshopDownloads.onlyProblems')}
			</Field.Label>
		</Field.Field>

		<Dialog.Footer class="sm:justify-between">
			{#if downloadsStore.isActive}
				{#if downloadsStore.canStop}
					<Button
						variant="destructive-outline"
						disabled={downloadsStore.isStopping}
						onclick={() => (isConfirmingStop = true)}
					>
						{t('workshopDownloads.stop')}
					</Button>
				{:else}
					<span></span>
				{/if}
				<Button
					variant="secondary"
					onclick={() => (downloadsStore.isOpen = false)}
				>
					{t('workshopDownloads.background')}
				</Button>
			{:else}
				<span></span>
				<Button onclick={() => downloadsStore.dismiss()}>
					{t('common.close')}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={isConfirmingStop}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title
				>{t('workshopDownloads.stopConfirm.title')}</AlertDialog.Title
			>
			<AlertDialog.Description>
				{t('workshopDownloads.stopConfirm.description', {
					count: downloadsStore.pending.length,
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={stop}>
				{t('workshopDownloads.stopConfirm.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
