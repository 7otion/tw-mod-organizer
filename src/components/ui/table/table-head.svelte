<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLThAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLThAttributes> = $props();
</script>

<th
	bind:this={ref}
	data-slot="table-head"
	class={cn(
		'h-7 px-3 text-left align-middle font-engraved text-[10.5px] font-bold tracking-[0.16em] whitespace-nowrap text-foreground-2 uppercase [&:has([role=checkbox])]:pr-0',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
