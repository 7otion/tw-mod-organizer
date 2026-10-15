<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-title"
	class={cn(
		'font-engraved text-[11.5px] leading-normal font-bold tracking-[0.18em] text-foreground-2 uppercase',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
