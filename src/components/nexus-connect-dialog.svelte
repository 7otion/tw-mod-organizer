<script lang="ts">
	import { writeText } from '@tauri-apps/plugin-clipboard-manager';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { toast } from 'svelte-sonner';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';

	import { t } from '@/lib/i18n';
	import { NexusStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	type Step = 'start' | 'waiting' | 'connected';

	const CLOSE_AFTER_MS = 2000;

	let { open = $bindable(false) }: { open: boolean } = $props();

	const nexusStore = NexusStore.get();

	let step = $state<Step>('start');

	const points = ['point1', 'point2', 'point3'] as const;

	async function start(): Promise<void> {
		step = 'waiting';
		try {
			const isConnected = await nexusStore.connect();
			if (!isConnected) return;
			step = 'connected';
			setTimeout(() => (open = false), CLOSE_AFTER_MS);
		} catch (error) {
			step = 'start';
			toastError(error);
		}
	}

	function close(): void {
		if (step === 'waiting') nexusStore.cancel();
		open = false;
	}

	async function copyLink(): Promise<void> {
		if (!nexusStore.ssoUrl) return;
		await writeText(nexusStore.ssoUrl);
		toast.success(t('nexus.connect.copied'));
	}

	$effect(() => {
		if (!open) step = 'start';
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && close()}>
	<Dialog.Content class="sm:max-w-[380px]">
		{#if step === 'start'}
			<div class="flex flex-col items-center gap-4 pt-4 text-center">
				<span
					class="grid size-14 place-items-center rounded-full bg-fill-2"
				>
					<GlobeIcon class="size-6" />
				</span>
				<Dialog.Header>
					<Dialog.Title>{t('nexus.connect.title')}</Dialog.Title>
				</Dialog.Header>
				<ul class="flex flex-col gap-2 self-stretch text-left text-sm">
					{#each points as point (point)}
						<li class="flex items-start gap-2.5">
							<span
								class="mt-1.5 size-[7px] shrink-0 rotate-45 bg-pink"
							></span>
							<span>{t(`nexus.connect.${point}`)}</span>
						</li>
					{/each}
				</ul>
			</div>
			<Dialog.Footer>
				<Button variant="ghost" onclick={close}>
					{t('nexus.connect.notNow')}
				</Button>
				<Button variant="pink" onclick={start}>
					<ExternalLinkIcon />
					{t('nexus.connect.continue')}
				</Button>
			</Dialog.Footer>
		{:else if step === 'waiting'}
			<div class="flex flex-col items-center gap-3 py-6 text-center">
				<LoaderCircleIcon
					class="size-8 animate-spin text-muted-foreground"
				/>
				<Dialog.Header>
					<Dialog.Title
						>{t('nexus.connect.waitingTitle')}</Dialog.Title
					>
					<Dialog.Description>
						{t('nexus.connect.waitingHint')}
					</Dialog.Description>
				</Dialog.Header>
				{#if nexusStore.ssoUrl}
					<Button variant="link" size="sm" onclick={copyLink}>
						{t('nexus.connect.copyLink')}
					</Button>
				{/if}
			</div>
			<Dialog.Footer>
				<Button variant="ghost" onclick={close}>
					{t('common.cancel')}
				</Button>
			</Dialog.Footer>
		{:else}
			<div class="flex flex-col items-center gap-3 py-6 text-center">
				<CircleCheckIcon class="size-10 text-status-ok" />
				<Dialog.Header>
					<Dialog.Title>
						{t('nexus.connect.connectedTitle', {
							name: nexusStore.userName ?? '',
						})}
					</Dialog.Title>
					<Dialog.Description>
						{t('nexus.connect.connectedHint')}
					</Dialog.Description>
				</Dialog.Header>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
