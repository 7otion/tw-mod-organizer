<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		inset,
		variant = 'default',
		...restProps
	}: ContextMenuPrimitive.ItemProps & {
		inset?: boolean;
		variant?: 'default' | 'destructive';
	} = $props();
</script>

<ContextMenuPrimitive.Item
	bind:ref
	data-slot="context-menu-item"
	data-inset={inset}
	data-variant={variant}
	class={cn(
		"group/context-menu-item relative flex h-row-compact cursor-default items-center gap-2 rounded-md px-2 text-md outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-8 data-[variant=destructive]:text-status-missing data-[variant=destructive]:focus:text-status-missing data-disabled:pointer-events-none data-disabled:text-foreground-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-status-missing",
		className
	)}
	{...restProps}
/>
