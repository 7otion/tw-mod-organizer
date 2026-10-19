<script lang="ts">
	import PinIcon from '@lucide/svelte/icons/pin';

	import { Button } from '@/components/ui/button';

	import { t, timeAgo } from '@/lib/i18n';
	import type { GameEntry } from '@/lib/store';
	import { cn } from '@/lib/utils';

	type Props = {
		game: GameEntry;
		isCurrent?: boolean;
		onopen: () => void;
		onpin: () => void;
	};

	let { game, isCurrent = false, onopen, onpin }: Props = $props();

	const openedAt = $derived(game.row?.last_opened_at);
</script>

<div class="group relative">
	<button
		type="button"
		role="option"
		aria-selected={isCurrent}
		class="flex min-h-13 w-full items-center gap-3 rounded-md py-1.5 pr-11 pl-2 text-left transition-colors duration-120 hover:bg-fill-2"
		onclick={onopen}
	>
		<img
			src={game.cover}
			alt=""
			class="h-9 w-16 shrink-0 rounded-sm object-cover"
		/>
		<span class="flex min-w-0 flex-1 flex-col leading-snug">
			<b class="truncate text-md font-semibold">
				{game.series}: {game.title}
			</b>
			<span class="flex items-baseline gap-2">
				<span class="text-xs text-muted-foreground">
					{openedAt
						? t('header.games.opened', { time: timeAgo(openedAt) })
						: t('header.games.notOpened')}
				</span>
				{#if isCurrent}
					<span
						class="pointer-events-none inline-flex items-center gap-1.5 text-3xs font-bold text-foreground-2"
					>
						<span class="size-1.5 rounded-full bg-pink"></span>
						{t('header.games.current')}
					</span>
				{/if}
			</span>
		</span>
	</button>
	{#if !isCurrent}
		<Button
			variant="ghost"
			size="icon-sm"
			aria-pressed={game.isPinned}
			aria-label={game.isPinned ? t('common.unpin') : t('common.pin')}
			class={cn(
				'absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100',
				game.isPinned && 'text-foreground-2 opacity-100'
			)}
			onclick={onpin}
		>
			<PinIcon class={cn(game.isPinned && 'fill-current')} />
		</Button>
	{/if}
</div>
