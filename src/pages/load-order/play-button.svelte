<script lang="ts">
	import PlayIcon from '@lucide/svelte/icons/play';
	import PowerIcon from '@lucide/svelte/icons/power';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import { GamesStore, LaunchStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	type Ripple = {
		id: number;
		x: number;
		y: number;
		size: number;
	};

	const gamesStore = GamesStore.get();
	const launchStore = LaunchStore.get();

	let isConfirmingQuit = $state(false);
	let ripples = $state.raw<Ripple[]>([]);
	let rippleSeq = 0;

	const elapsed = $derived(
		LaunchStore.formatElapsed(launchStore.elapsedSeconds)
	);

	function ripple(event: PointerEvent): void {
		const rect = (
			event.currentTarget as HTMLElement
		).getBoundingClientRect();
		const size = Math.max(rect.width, rect.height) * 2;
		ripples = [
			...ripples,
			{
				id: ++rippleSeq,
				x: event.clientX - rect.left - size / 2,
				y: event.clientY - rect.top - size / 2,
				size,
			},
		];
	}

	function settle(id: number): void {
		ripples = ripples.filter((item) => item.id !== id);
	}

	async function play(): Promise<void> {
		try {
			await launchStore.play();
		} catch (error) {
			toastError(error);
		}
	}

	async function forceQuit(): Promise<void> {
		try {
			await launchStore.forceQuit();
		} catch (error) {
			toastError(error);
		}
	}
</script>

<div class="flex items-center gap-3">
	{#if launchStore.isRunning}
		<span
			class="inline-flex h-8 items-center gap-2 rounded-full px-4 font-engraved text-[13px] font-bold tracking-[0.16em] text-pink uppercase tabular-nums shadow-[inset_0_0_0_1.5px_var(--pink)]"
		>
			<span class="size-1.5 animate-pulse rounded-full bg-pink"></span>
			{t('loadOrder.play.inGame', { time: elapsed })}
		</span>
		<Button variant="ghost" onclick={() => (isConfirmingQuit = true)}>
			<PowerIcon />
			{t('loadOrder.play.forceQuit')}
		</Button>
	{:else}
		<button
			type="button"
			class="relative isolate inline-flex h-11 cursor-pointer items-center gap-2.5 overflow-hidden rounded-full bg-pink pr-7 pl-6 font-engraved text-[17px] font-bold tracking-[0.24em] text-pink-ink uppercase hover:bg-pink-hover disabled:cursor-default disabled:opacity-60"
			disabled={launchStore.isLaunching ||
				!gamesStore.current?.installPath}
			onpointerdown={ripple}
			onclick={play}
		>
			{#each ripples as item (item.id)}
				<span
					class="pointer-events-none absolute -z-10 animate-ripple rounded-full bg-white/50"
					style:left="{item.x}px"
					style:top="{item.y}px"
					style:width="{item.size}px"
					style:height="{item.size}px"
					onanimationend={() => settle(item.id)}
				></span>
			{/each}
			<PlayIcon class="size-4 fill-current" />
			{t('loadOrder.play.play')}
		</button>
	{/if}
</div>

<AlertDialog.Root bind:open={isConfirmingQuit}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('loadOrder.play.quitConfirm.title', {
					title: gamesStore.current?.title ?? '',
				})}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('loadOrder.play.quitConfirm.description')}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={forceQuit}>
				{t('loadOrder.play.quitConfirm.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
