<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const alertVariants = tv({
		base: "group/alert relative grid w-full gap-0.5 border px-3 py-2 text-left text-sm text-foreground-2 has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default: 'border-line-strong bg-void *:[svg]:text-current',
				info: 'border-[#1f3a55] bg-[#0b1622] *:[svg]:text-gem-sapphire',
				warning: 'border-[#5a4520] bg-[#1a1408] *:[svg]:text-gem-gold',
				success:
					'border-[#1d4a3c] bg-[#08160f] *:[svg]:text-gem-emerald',
				destructive:
					'border-[#5a2530] bg-[#1c0a0e] *:[svg]:text-gem-blood',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	});

	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '@/lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
