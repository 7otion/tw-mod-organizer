<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	import { cn } from '@/lib/utils';

	type Props = {
		label: string;
		class?: string;
		children: Snippet;
	};

	let { label, class: className, children }: Props = $props();
</script>

<div
	transition:fly|global={{ x: 48, duration: 180, easing: cubicOut }}
	role="dialog"
	aria-modal="false"
	aria-label={label}
	class={cn(
		'absolute inset-y-0 right-0 z-20 flex w-[440px] flex-col border-l border-line-2 bg-tone-1 shadow-[-18px_0_40px_rgba(0,0,0,0.35)]',
		className
	)}
>
	{@render children()}
</div>
