<script lang="ts">
	import type { HTMLThAttributes } from 'svelte/elements';

	import { cn, type WithElementRef } from '@/lib/utils.js';

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
		'h-8 px-3 text-left align-middle text-sm font-semibold whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
