<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CommandPrimitive.LinkItemProps = $props();
</script>

<CommandPrimitive.LinkItem
	bind:ref
	data-slot="command-item"
	class={cn(
		"group/command-item relative flex h-row-compact cursor-default items-center gap-2 px-3 text-md outline-hidden select-none data-selected:bg-active data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:**:[svg]:text-foreground",
		'data-disabled:pointer-events-none data-disabled:text-muted-foreground',
		className
	)}
	{...restProps}
/>
