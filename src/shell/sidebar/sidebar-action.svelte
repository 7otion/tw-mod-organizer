<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';

	import { Button } from '@/components/ui/button';

	type Props = {
		icon: LucideIcon;
		disabled?: boolean;
		onclick?: () => void;
		children: Snippet;
	};

	let { icon: Icon, disabled, onclick, children }: Props = $props();
</script>

<Button
	variant="ghost"
	class="h-7 justify-start gap-2 rounded-none px-4 text-md font-normal text-foreground-2 hover:bg-hover"
	{disabled}
	{onclick}
>
	<Icon class="size-4" />
	{@render children()}
</Button>
