<script lang="ts">
	import { Slider as SliderPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = 'horizontal',
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	data-slot="slider"
	{orientation}
	class={cn(
		'relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
		className
	)}
	{...restProps}
>
	{#snippet children({ thumbItems })}
		<span
			data-slot="slider-track"
			data-orientation={orientation}
			class={cn(
				'relative grow overflow-hidden bg-[#1d1722] data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1'
			)}
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class={cn(
					'absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full'
				)}
			/>
		</span>
		{#each thumbItems as thumb (thumb.index)}
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				index={thumb.index}
				class="block size-3 shrink-0 rotate-45 bg-primary transition-[color,box-shadow] select-none hover:shadow-[0_0_8px_rgba(255,77,148,0.55)] focus-visible:shadow-focus-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
