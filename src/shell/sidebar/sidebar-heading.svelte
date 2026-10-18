<script lang="ts">
	import type { Snippet } from 'svelte';

	import { buttonVariants } from '@/components/ui/button';
	import * as Tooltip from '@/components/ui/tooltip';
	import { cn } from '@/lib/utils';

	type Props = {
		title: string;
		tooltip: string;
		onclick?: () => void;
		children: Snippet;
	};

	let { title, tooltip, onclick, children }: Props = $props();
</script>

<div
	class="flex items-center justify-between px-4 pb-2 font-engraved text-xs font-bold tracking-[0.2em] text-muted-foreground"
>
	{title}
	<Tooltip.Root>
		<Tooltip.Trigger
			{onclick}
			class={cn(
				buttonVariants({ variant: 'ghost', size: 'xs' }),
				'h-auto gap-1 rounded-shell px-1 py-0.5 font-sans text-xs font-semibold tracking-normal text-pink-strong hover:bg-hover hover:text-pink-strong'
			)}
		>
			{@render children()}
		</Tooltip.Trigger>
		<Tooltip.Content side="right">{tooltip}</Tooltip.Content>
	</Tooltip.Root>
</div>
