<script lang="ts">
	import { Dialog as SheetPrimitive } from 'bits-ui';
	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.TitleProps = $props();
</script>

<SheetPrimitive.Title
	bind:ref
	data-slot="sheet-title"
	class={cn(
		'font-engraved text-xs font-bold tracking-[0.22em] text-muted-foreground uppercase',
		className
	)}
	{...restProps}
/>
