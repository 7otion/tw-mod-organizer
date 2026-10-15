<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type {
		HTMLAnchorAttributes,
		HTMLButtonAttributes,
	} from 'svelte/elements';

	export const buttonVariants = tv({
		base: "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:shadow-focus-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default:
					'border-primary bg-primary text-primary-foreground hover:bg-primary/80',
				outline:
					'border-line-control bg-transparent hover:bg-hover hover:text-foreground aria-expanded:bg-active aria-expanded:text-foreground',
				secondary:
					'border-line-control bg-secondary text-secondary-foreground hover:border-[#6a4a5f] hover:bg-active aria-expanded:bg-active aria-expanded:text-secondary-foreground',
				ghost: 'text-foreground-2 hover:bg-hover hover:text-foreground aria-expanded:bg-active aria-expanded:text-foreground',
				destructive:
					'border-danger-fill bg-danger-fill text-white hover:bg-danger-fill/85',
				'destructive-outline':
					'border-[#5a2530] bg-transparent text-destructive hover:bg-destructive/10',
				link: 'text-pink-strong hover:text-[#ffa3c8]',
			},
			size: {
				default:
					'h-8 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
				xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 px-2 [&_svg:not([class*='size-'])]:size-[13px]",
				lg: 'h-9 px-5',
				icon: 'size-[30px]',
				'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'size-7',
				'icon-lg': 'size-9',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
