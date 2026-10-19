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
		onclick: () => void;
	};

	let {
		icon: Icon,
		label,
		active = false,
		busy = false,
		iconClass,
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
	</Tooltip.Trigger>
	<Tooltip.Content side="right">{label}</Tooltip.Content>
</Tooltip.Root>
