<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(
		'group/radio-group-item peer relative flex size-2.5 shrink-0 rotate-45 border-[1.5px] border-[#6b5064] outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-[#6b5064] after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary',
		className
	)}
	{...restProps}
/>
