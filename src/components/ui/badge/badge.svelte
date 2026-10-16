<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent whitespace-nowrap transition-all focus-visible:shadow-focus-ring aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!',
		variants: {
			variant: {
				default:
					'h-4 bg-primary px-[5px] text-3xs font-bold tracking-[0.06em] text-primary-foreground [a]:hover:bg-primary/80',
				secondary:
					'h-4 bg-secondary px-[5px] text-3xs font-bold tracking-[0.06em] text-secondary-foreground',
				destructive:
					'h-4 bg-destructive px-[5px] text-3xs font-bold tracking-[0.06em] text-primary-foreground',
				outline:
					'h-6 border-line-strong px-2 text-xs text-foreground-2 [a]:hover:bg-hover',
				tag: 'h-6 border-[#5a2541] px-2 text-xs text-pink-strong [a]:hover:bg-hover',
				ghost: 'h-6 px-2 text-xs text-foreground-2 hover:bg-hover hover:text-foreground',
				link: 'text-xs text-pink-strong hover:text-[#ffa3c8]',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
