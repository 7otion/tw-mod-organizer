<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const toggleVariants = tv({
		base: "group/toggle inline-flex items-center justify-center gap-1.5 rounded-none text-sm font-semibold whitespace-nowrap text-muted-foreground transition-[color,box-shadow] outline-none hover:text-foreground focus-visible:shadow-focus-ring disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-pressed:bg-pink-soft aria-pressed:text-foreground aria-pressed:shadow-[inset_0_-2px_0_var(--pink)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default: 'bg-transparent',
				outline: 'border border-line-control bg-transparent',
				filter: 'border-b border-transparent bg-transparent px-2 font-medium aria-pressed:border-primary aria-pressed:bg-transparent aria-pressed:shadow-none data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:shadow-none',
			},
			size: {
				default:
					'h-7 min-w-7 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
				sm: 'h-6 min-w-6 px-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
				lg: 'h-8 min-w-8 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	});

	export type ToggleVariant = VariantProps<typeof toggleVariants>['variant'];
	export type ToggleSize = VariantProps<typeof toggleVariants>['size'];
	export type ToggleVariants = VariantProps<typeof toggleVariants>;
</script>

<script lang="ts">
	import { Toggle as TogglePrimitive } from 'bits-ui';
	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		pressed = $bindable(false),
		class: className,
		size = 'default',
		variant = 'default',
		...restProps
	}: TogglePrimitive.RootProps & {
		variant?: ToggleVariant;
		size?: ToggleSize;
	} = $props();
</script>

<TogglePrimitive.Root
	bind:ref
	bind:pressed
	data-slot="toggle"
	class={cn(toggleVariants({ variant, size }), className)}
	{...restProps}
/>
