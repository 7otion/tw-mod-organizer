<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '@/lib/utils';

	type Props = {
		name: string;
		count: string | number;
		active?: boolean;
		marker: Snippet;
		children?: Snippet;
	};

	let { name, count, active = false, marker, children }: Props = $props();
</script>

<li
	class={cn(
		'flex h-row-compact cursor-pointer items-center gap-2 px-4 text-md text-foreground-2 hover:bg-hover',
		active && 'bg-linear-to-r from-pink-soft to-transparent text-foreground'
	)}
>
	{@render marker()}
	<span class="min-w-0 flex-1 truncate">{name}</span>
	{@render children?.()}
	<span class="font-mono text-xs text-muted-foreground">{count}</span>
</li>
