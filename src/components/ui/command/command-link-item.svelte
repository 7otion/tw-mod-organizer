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
		"group/command-item relative flex h-row-compact cursor-default items-center gap-2 rounded-md px-2 text-md outline-hidden select-none data-selected:bg-fill-2 data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:**:[svg]:text-foreground",
		'data-disabled:pointer-events-none data-disabled:text-foreground-4',
		className
	)}
	{...restProps}
/>
