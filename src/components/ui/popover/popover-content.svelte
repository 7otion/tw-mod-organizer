<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import type { ComponentProps } from 'svelte';

	import { cn, type WithoutChildrenOrChild } from '@/lib/utils.js';

	import PopoverPortal from './popover-portal.svelte';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		align = 'center',
		portalProps,
		...restProps
	}: PopoverPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<
			ComponentProps<typeof PopoverPortal>
		>;
	} = $props();
</script>

<PopoverPortal {...portalProps}>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{align}
		class={cn(
			'z-[calc(var(--z-modal)+1)] flex w-72 origin-(--bits-popover-content-transform-origin) flex-col gap-4 rounded-lg bg-popover p-4 text-md text-popover-foreground shadow-pop outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
			className
		)}
		{...restProps}
	/>
</PopoverPortal>
