<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const alertVariants = tv({
		base: "group/alert relative grid w-full gap-0.5 rounded-lg px-3 py-2 text-left text-md text-foreground-2 has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default: 'bg-fill-1 *:[svg]:text-current',
				info: 'bg-status-update/8 *:[svg]:text-status-update',
				warning: 'bg-status-warn/8 *:[svg]:text-status-warn',
				success: 'bg-status-ok/8 *:[svg]:text-status-ok',
				destructive: 'bg-status-missing/8 *:[svg]:text-status-missing',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	});

	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import { cn, type WithElementRef } from '@/lib/utils.js';

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
