<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		children?: Snippet;
	};

	let { title, children }: Props = $props();
</script>

<div
	class="flex items-center justify-between px-4 pb-2 font-macondo tracking-[0.2em] text-pink/90 uppercase"
>
	{title}
	<span class="flex items-center gap-1">{@render children?.()}</span>
</div>
