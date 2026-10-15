<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

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
		'border-b border-[#170f15] transition-colors hover:bg-hover has-aria-expanded:bg-hover data-[state=selected]:bg-pink-soft',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
