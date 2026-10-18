<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full whitespace-nowrap transition-colors aria-invalid:shadow-[inset_0_0_0_1px_var(--st-missing)] [&>svg]:pointer-events-none [&>svg]:size-3!',
		variants: {
			variant: {
				default:
					'h-4 min-w-4 bg-pink px-1 text-3xs leading-none font-bold text-pink-ink [a]:hover:bg-pink-hover',
				secondary:
					'h-5 bg-fill-2 px-2 text-xs font-semibold text-foreground-2',
				destructive:
					'h-5 bg-fill-1 px-2 text-xs font-semibold text-status-missing',
				outline:
					'h-5 px-2 text-xs font-medium text-foreground-2 shadow-[inset_0_0_0_1px_var(--line-2)] [a]:hover:bg-fill-1',
				tag: 'h-5 bg-fill-1 px-2 text-xs font-medium text-foreground-2 [a]:hover:bg-fill-2',
				ghost: 'h-5 px-2 text-xs font-medium text-foreground-2 hover:bg-fill-1 hover:text-foreground',
				link: 'text-xs text-foreground underline decoration-white/30 underline-offset-3',
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
