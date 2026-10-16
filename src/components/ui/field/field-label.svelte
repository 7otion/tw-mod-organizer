<script lang="ts">
	import { Label } from '@/components/ui/label/index.js';
	import { cn } from '@/lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: ComponentProps<typeof Label> = $props();
</script>

<Label
	bind:ref
	data-slot="field-label"
	class={cn(
		'group/field-label peer/field-label flex w-fit gap-2 text-sm leading-snug font-semibold text-foreground-2 group-data-[disabled=true]/field:opacity-50 group-data-[orientation=horizontal]/field:text-md group-data-[orientation=horizontal]/field:font-normal has-data-checked:bg-fill-2 has-data-checked:shadow-[inset_0_0_0_1.5px_var(--text-2)] has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:bg-fill-1 has-[>[data-slot=field]]:text-md has-[>[data-slot=field]]:font-normal has-[>[data-slot=field]]:text-foreground has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-fill-2 *:data-[slot=field]:p-3',
		'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</Label>
