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
		'group/radio-group-item peer relative flex size-4 shrink-0 rounded-full border-[1.5px] border-[#5a5459] transition-colors outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-[#7a7379] disabled:cursor-not-allowed disabled:opacity-35 aria-invalid:border-status-missing data-checked:border-foreground data-checked:bg-[radial-gradient(circle,var(--text-1)_0_3.5px,transparent_4px)]',
		className
	)}
	{...restProps}
/>
