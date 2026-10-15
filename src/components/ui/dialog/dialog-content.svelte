<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '@/components/ui/button/index.js';
	import { cn, type WithoutChildrenOrChild } from '@/lib/utils.js';
	import * as Dialog from './index.js';
	import DialogPortal from './dialog-portal.svelte';
	import type { Snippet } from 'svelte';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<
			ComponentProps<typeof DialogPortal>
		>;
		children: Snippet;
		showCloseButton?: boolean;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'fixed top-[calc(50%+var(--h-titlebar)/2)] left-1/2 z-(--z-modal) grid w-full max-w-[calc(100%_-_2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 bg-panel p-5 text-md text-foreground shadow-modal duration-100 outline-none before:pointer-events-none before:absolute before:-top-px before:-left-px before:size-4 before:border-t before:border-l before:border-primary after:pointer-events-none after:absolute after:-top-px after:-right-px after:size-4 after:border-t after:border-r after:border-primary sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button
						variant="ghost"
						class="absolute top-4 right-4"
						size="icon-sm"
						{...props}
					>
						<XIcon />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
