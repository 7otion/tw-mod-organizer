<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	import { cn } from '@/lib/utils';

	type Props = {
		title: string;
		titleClass?: ClassValue;
		description: string;
		children: Snippet;
	};

	let { title, titleClass, description, children }: Props = $props();
</script>

<div
	class="grid min-h-13 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t px-3 py-2 first:border-t-0"
>
	<div class="flex min-w-0 flex-col gap-0.5">
		<span class={cn('text-md font-semibold', titleClass)}>{title}</span>
		<span class="text-xs text-muted-foreground">{description}</span>
	</div>
	{@render children()}
</div>
