<script lang="ts">
	import PinIcon from '@lucide/svelte/icons/pin';

	import { Button } from '@/components/ui/button';

	import { t, timeAgo } from '@/lib/i18n';
	import type { GameEntry } from '@/lib/store';
	import { cn } from '@/lib/utils';

	type Props = {
		game: GameEntry;
		isSelected: boolean;
		onselect: () => void;
		oncontinue: () => void;
		onpin: () => void;
	};

	let { game, isSelected, onselect, oncontinue, onpin }: Props = $props();

	const openedAt = $derived(game.row?.last_opened_at);
</script>

<div class="group relative">
	<button
		type="button"
		aria-pressed={isSelected}
		class="flex w-full flex-col gap-2 text-left"
		onclick={onselect}
		ondblclick={oncontinue}
	>
		<span
			class={cn(
				'relative block aspect-video overflow-hidden rounded-lg after:absolute after:inset-0 after:rounded-lg after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
				isSelected && 'after:shadow-[inset_0_0_0_2px_var(--pink)]'
			)}
		>
			<img src={game.cover} alt="" class="size-full object-cover" />
			{#if isSelected}
				<span
					class="absolute top-2.5 left-2.5 z-10 inline-flex h-5 items-center gap-1.5 rounded-full bg-black/80 px-2 font-engraved text-xs font-bold tracking-[0.08em] text-foreground"
				>
					<span class="size-1.5 rounded-full bg-pink"></span>
					{t('gameSelector.card.selected')}
				</span>
			{/if}
		</span>
		<span class="flex flex-col leading-tight">
			<small class="text-xs font-medium text-red-500 uppercase">
				{game.series}
			</small>
			<strong class="text-lg font-semibold">{game.title}</strong>
		</span>
		<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
			<span
				class="inline-flex items-center gap-1.5 font-semibold text-foreground-2"
			>
				<span class="size-1.5 rounded-full bg-foreground-2"></span>
				{t('gameSelector.card.installed')}
			</span>
			·
			{openedAt
				? t('gameSelector.card.opened', { time: timeAgo(openedAt) })
				: t('gameSelector.card.notOpened')}
		</span>
	</button>
	<Button
		variant="ghost"
		size="icon-sm"
		aria-pressed={game.isPinned}
		aria-label={game.isPinned ? t('common.unpin') : t('common.pin')}
		class={cn(
			'absolute top-2 right-2 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 hover:bg-black/85',
			game.isPinned && 'text-foreground opacity-100'
		)}
		onclick={onpin}
	>
		<PinIcon class={cn(game.isPinned && 'fill-current')} />
	</Button>
</div>
