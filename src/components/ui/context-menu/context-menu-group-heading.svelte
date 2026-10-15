<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';
	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		inset,
		...restProps
	}: ContextMenuPrimitive.GroupHeadingProps & {
		inset?: boolean;
	} = $props();
</script>

<ContextMenuPrimitive.GroupHeading
	bind:ref
	data-slot="context-menu-group-heading"
	data-inset={inset}
	class={cn(
		'px-3 py-1.5 font-engraved text-[10.5px] font-bold tracking-[0.2em] text-muted-foreground uppercase data-inset:pl-8',
		className
	)}
	{...restProps}
/>
