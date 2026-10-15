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
	data-slot="sheet-header"
	class={cn(
		'flex h-11 shrink-0 flex-row items-center gap-2 border-b pr-12 pl-4',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
