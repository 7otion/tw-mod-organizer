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
		'flex field-sizing-content min-h-16 w-full border border-input bg-field px-3 py-2 text-md transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/18 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
		className
	)}
	bind:value
	{...restProps}></textarea>
