<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import { cn, type WithElementRef } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn(
		'transition-colors duration-120 hover:bg-fill-1 has-aria-expanded:bg-fill-1 data-[state=selected]:bg-pink-tint data-[state=selected]:hover:bg-pink-tint-2',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
