<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		inset?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="context-menu-label"
	data-inset={inset}
	class={cn(
		'px-3 py-1.5 font-engraved text-2xs font-bold tracking-[0.2em] text-muted-foreground uppercase data-inset:pl-8',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
