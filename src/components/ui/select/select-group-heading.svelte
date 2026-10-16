<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '@/lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: ComponentProps<typeof SelectPrimitive.GroupHeading> = $props();
</script>

<SelectPrimitive.GroupHeading
	bind:ref
	data-slot="select-group-heading"
	class={cn(
		'px-3 py-1.5 font-engraved text-2xs font-bold tracking-[0.2em] text-muted-foreground uppercase',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</SelectPrimitive.GroupHeading>
