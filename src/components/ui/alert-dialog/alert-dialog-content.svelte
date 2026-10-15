<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import {
		cn,
		type WithoutChild,
		type WithoutChildrenOrChild,
	} from '@/lib/utils.js';
	import AlertDialogOverlay from './alert-dialog-overlay.svelte';
	import AlertDialogPortal from './alert-dialog-portal.svelte';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		size = 'default',
		portalProps,
		...restProps
	}: WithoutChild<AlertDialogPrimitive.ContentProps> & {
		size?: 'default' | 'sm';
		portalProps?: WithoutChildrenOrChild<
			ComponentProps<typeof AlertDialogPortal>
		>;
	} = $props();
</script>

<AlertDialogPortal {...portalProps}>
	<AlertDialogOverlay />
	<AlertDialogPrimitive.Content
		bind:ref
		data-slot="alert-dialog-content"
		data-size={size}
		class={cn(
			'group/alert-dialog-content fixed top-[calc(50%+var(--h-titlebar)/2)] left-1/2 z-(--z-modal) grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 bg-panel p-5 text-md text-foreground shadow-modal duration-100 outline-none before:pointer-events-none before:absolute before:-top-px before:-left-px before:size-4 before:border-t before:border-l before:border-primary after:pointer-events-none after:absolute after:-top-px after:-right-px after:size-4 after:border-t after:border-r after:border-primary data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
			className
		)}
		{...restProps}
	/>
</AlertDialogPortal>
