<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';

	import * as Tooltip from '@/components/ui/tooltip';

	import { cn } from '@/lib/utils';

	type Props = {
		icon: LucideIcon;
		label: string;
		active?: boolean;
		busy?: boolean;
		iconClass?: string;
		badge?: string | null;
		hasDot?: boolean;
		onclick: () => void;
	};

	let {
		icon: Icon,
		label,
		active = false,
		busy = false,
		iconClass,
		badge = null,
		hasDot = false,
		onclick,
	}: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		aria-label={label}
		aria-busy={busy || undefined}
		class={cn(
			'relative grid size-10 place-items-center rounded-shell text-muted-foreground outline-0 hover:bg-hover hover:text-foreground',
			active && 'bg-pink-deep/12 text-pink-deep hover:text-pink-deep'
		)}
		{onclick}
	>
		<Icon class={cn('size-5', iconClass)} />
		{#if badge}
			<span
				class="absolute top-1 right-[3px] h-4 min-w-4 rounded-full bg-foreground px-1 text-center text-3xs leading-4 font-bold text-background tabular-nums"
			>
				{badge}
			</span>
		{:else if hasDot}
			<span
				class="absolute top-2 right-2 size-2 rounded-full bg-status-update ring-2 ring-tone-0"
			></span>
		{/if}
	</Tooltip.Trigger>
	<Tooltip.Content side="right">{label}</Tooltip.Content>
</Tooltip.Root>
