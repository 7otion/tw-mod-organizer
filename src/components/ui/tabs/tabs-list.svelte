<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const tabsListVariants = tv({
		base: 'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none data-[variant=line]:p-0',
		variants: {
			variant: {
				default: 'bg-muted',
				line: 'gap-1 border-b bg-transparent',
			},
		},
		defaultVariants: {
			variant: 'line',
		},
	});

	export type TabsListVariant = VariantProps<
		typeof tabsListVariants
	>['variant'];
</script>

<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		variant = 'line',
		class: className,
		...restProps
	}: TabsPrimitive.ListProps & {
		variant?: TabsListVariant;
	} = $props();
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	data-variant={variant}
	class={cn(tabsListVariants({ variant }), className)}
	{...restProps}
/>
