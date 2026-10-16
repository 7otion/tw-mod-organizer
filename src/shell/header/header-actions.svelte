<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PanelTopIcon from '@lucide/svelte/icons/panel-top';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import { Button } from '@/components/ui/button';

	type HeaderAction = {
		label: string;
		icon: LucideIcon;
		isPrimary?: boolean;
		opensDialog?: boolean;
	};

	const ACTIONS: HeaderAction[] = [
		{ label: 'Add mods', icon: PlusIcon, isPrimary: true },
		{ label: 'Separator', icon: PanelTopIcon },
		{ label: 'Link group', icon: LayersIcon },
		{ label: 'Sort…', icon: ArrowDownWideNarrowIcon, opensDialog: true },
	];
</script>

<div class="clickable-content flex items-center gap-1.5 self-center">
	{#each ACTIONS as action (action.label)}
		<Button
			variant={action.isPrimary ? 'default' : 'secondary'}
			aria-haspopup={action.opensDialog ? 'dialog' : undefined}
			class={[
				'h-7 gap-1.5 rounded-shell px-3 text-sm font-semibold',
				action.isPrimary
					? 'bg-bone text-bone-ink hover:bg-foreground'
					: 'bg-raised hover:bg-active aria-expanded:bg-active',
			]}
		>
			<action.icon class="size-3.5" />
			{action.label}
		</Button>
	{/each}
</div>
