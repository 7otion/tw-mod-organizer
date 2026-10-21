<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import { cn } from '@/lib/utils.js';

	let {
		class: className,
		role = 'status',
		'aria-label': ariaLabel = 'Loading',
		...restProps
	}: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span
	data-slot="spinner"
	{role}
	aria-label={ariaLabel}
	class={cn(
		'inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-fill-3 border-t-foreground',
		className
	)}
	{...restProps}
></span>
