<script lang="ts">
	import { Separator } from '@/components/ui/separator/index.js';
	import { cn } from '@/lib/utils.js';
	import type { Separator as SeparatorPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SeparatorPrimitive.RootProps = $props();
</script>

<Separator
	bind:ref
	data-slot="select-separator"
	class={cn('pointer-events-none my-1.5 h-px bg-line-strong', className)}
	{...restProps}
/>
