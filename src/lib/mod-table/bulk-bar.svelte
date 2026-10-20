<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import type { Selection } from '@/lib/selection.svelte';

	type Props = {
		selection: Selection<number>;
		ref?: HTMLElement | null;
		children?: Snippet;
	};

	let { selection, ref = $bindable(null), children }: Props = $props();
</script>

<div
	bind:this={ref}
	class="absolute bottom-4.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-[10px] bg-surface-2 py-1.5 pr-1.5 pl-3 whitespace-nowrap shadow-pop"
>
	<strong class="mr-2 text-sm font-semibold">
		<Message key="modTable.selected" values={{ count: selection.count }}>
			{#snippet value(text)}
				<b class="text-md text-foreground">{text}</b>
			{/snippet}
		</Message>
	</strong>
	{@render children?.()}
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={t('common.clearSelection')}
		onclick={() => selection.clear()}
	>
		<XIcon />
	</Button>
</div>
