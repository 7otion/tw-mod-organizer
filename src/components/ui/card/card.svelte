<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = 'default',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: 'default' | 'sm';
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	class={cn(
		'group/card flex flex-col overflow-hidden border bg-card text-md text-card-foreground [--card-spacing:--spacing(3)] data-[size=sm]:[--card-spacing:--spacing(2)]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
