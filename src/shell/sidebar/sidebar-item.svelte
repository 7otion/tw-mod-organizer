<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	import { cn } from '@/lib/utils';

	type Props = Omit<HTMLButtonAttributes, 'children'> & {
		active?: boolean;
		children: Snippet;
	};

	let { active = false, children, ...rest }: Props = $props();
</script>

<li>
	<button
		{...rest}
		type="button"
		aria-pressed={rest.onclick ? active : undefined}
		class={cn(
			'flex h-row-compact w-full cursor-pointer items-center gap-2 px-4 text-left text-md text-foreground-2 hover:bg-hover',
			active &&
				'bg-linear-to-r from-pink-soft to-transparent text-foreground'
		)}
	>
		{@render children()}
	</button>
</li>
