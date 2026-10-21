<script lang="ts">
	import type { Snippet } from 'svelte';

	import { buttonVariants } from '@/components/ui/button';
	import * as Tooltip from '@/components/ui/tooltip';

	import { cn } from '@/lib/utils';

	type Props = {
		tooltip?: string;
		onclick?: () => void;
		children: Snippet;
	};

	let { tooltip, onclick, children }: Props = $props();

	const classes = cn(
		buttonVariants({ variant: 'ghost', size: 'xs' }),
		'h-auto gap-1 rounded-shell px-1 py-0.5 font-sans text-xs font-semibold tracking-normal text-pink-strong hover:bg-hover hover:text-pink-strong'
	);
</script>

{#if tooltip}
	<Tooltip.Root>
		<Tooltip.Trigger {onclick} class={classes}>
			{@render children()}
		</Tooltip.Trigger>
		<Tooltip.Content side="right">{tooltip}</Tooltip.Content>
	</Tooltip.Root>
{:else}
	<button type="button" {onclick} class={classes}>
		{@render children()}
	</button>
{/if}
