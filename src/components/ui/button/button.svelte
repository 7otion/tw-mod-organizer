<script lang="ts" module>
	import type {
		HTMLAnchorAttributes,
		HTMLButtonAttributes,
	} from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	import { cn, type WithElementRef } from '@/lib/utils.js';

	export const buttonVariants = tv({
		base: "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-md font-semibold whitespace-nowrap transition-colors duration-120 outline-none select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-primary-hover',
				outline:
					'text-foreground shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-fill-1 active:bg-fill-2 aria-expanded:bg-fill-2',
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-fill-2 active:bg-fill-3 aria-expanded:bg-fill-2',
				ghost: 'text-foreground-2 hover:bg-fill-1 hover:text-foreground active:bg-fill-2 aria-expanded:bg-fill-1 aria-expanded:text-foreground',
				destructive: 'bg-danger text-white hover:bg-danger-hover',
				'destructive-outline':
					'text-status-missing hover:bg-fill-1 active:bg-fill-2',
				link: 'text-foreground underline decoration-white/30 underline-offset-3 hover:decoration-white/60',
				pink: 'bg-pink-deep text-white hover:bg-pink-deep/70',
			},
			size: {
				default:
					'h-8 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
				xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 px-2 text-sm [&_svg:not([class*='size-'])]:size-3.5",
				lg: 'h-9 px-5',
				icon: 'size-8',
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
