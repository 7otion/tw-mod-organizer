<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		size = 'default',
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & {
		size?: 'sm' | 'default';
	} = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	data-size={size}
	class={cn(
		'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-line-control bg-field p-0.5 transition-all outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18px] data-[size=default]:w-[34px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-disabled:cursor-not-allowed data-disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		data-slot="switch-thumb"
		class={cn(
			'pointer-events-none block rounded-full bg-[#6b5064] ring-0 transition-transform group-data-[size=default]/switch:size-3 group-data-[size=sm]/switch:size-2 data-checked:bg-primary group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-checked:translate-x-2.5 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0',
			'rtl:data-[state=checked]:translate-x-[calc(-100%)]'
		)}
	/>
</SwitchPrimitive.Root>
