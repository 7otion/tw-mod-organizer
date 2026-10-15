<script lang="ts">
	import { Command as CommandPrimitive, useId } from 'bits-ui';
	import { cn } from '@/lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		heading,
		value,
		...restProps
	}: CommandPrimitive.GroupProps & {
		heading?: string;
	} = $props();
</script>

<CommandPrimitive.Group
	bind:ref
	data-slot="command-group"
	class={cn(
		'overflow-hidden py-1 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:font-engraved **:[[cmdk-group-heading]]:text-[10.5px] **:[[cmdk-group-heading]]:font-bold **:[[cmdk-group-heading]]:tracking-[0.2em] **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:uppercase',
		className
	)}
	value={value ?? heading ?? `----${useId()}`}
	{...restProps}
>
	{#if heading}
		<CommandPrimitive.GroupHeading
			class="px-3 py-1.5 font-engraved text-[10.5px] font-bold tracking-[0.2em] text-muted-foreground uppercase"
		>
			{heading}
		</CommandPrimitive.GroupHeading>
	{/if}
	<CommandPrimitive.GroupItems {children} />
</CommandPrimitive.Group>
