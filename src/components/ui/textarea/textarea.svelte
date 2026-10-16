<script lang="ts">
	import {
		cn,
		type WithElementRef,
		type WithoutChildren,
	} from '@/lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'flex field-sizing-content min-h-16 w-full rounded-md bg-input px-3 py-2 text-md transition-[background-color,box-shadow] duration-120 outline-none placeholder:text-muted-foreground focus-visible:bg-fill-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1px_var(--st-missing)]',
		className
	)}
	bind:value
	{...restProps}></textarea>
