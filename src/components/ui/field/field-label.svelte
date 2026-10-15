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
		'group/field-label peer/field-label flex w-fit gap-2 font-engraved text-[10.5px] leading-snug font-bold tracking-[0.2em] text-muted-foreground uppercase group-data-[disabled=true]/field:opacity-50 group-data-[orientation=horizontal]/field:font-sans group-data-[orientation=horizontal]/field:text-md group-data-[orientation=horizontal]/field:font-normal group-data-[orientation=horizontal]/field:tracking-normal group-data-[orientation=horizontal]/field:text-foreground-2 group-data-[orientation=horizontal]/field:normal-case has-data-checked:border-primary has-data-checked:bg-pink-soft has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-line-strong has-[>[data-slot=field]]:font-sans has-[>[data-slot=field]]:text-md has-[>[data-slot=field]]:font-normal has-[>[data-slot=field]]:tracking-normal has-[>[data-slot=field]]:text-foreground has-[>[data-slot=field]]:normal-case has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-hover has-[>[data-slot=field]]:has-[:focus-visible]:shadow-focus-ring *:data-[slot=field]:p-3 dark:has-data-checked:border-primary dark:has-data-checked:bg-pink-soft',
		'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</Label>
