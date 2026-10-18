<script lang="ts">
	import Settings2Icon from '@lucide/svelte/icons/settings-2';

	import * as Tooltip from '@/components/ui/tooltip';

	import { cn } from '@/lib/utils';

	import SettingsDialog from './settings-dialog.svelte';

	let isOpen = $state(false);
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		aria-label="Settings"
		class={cn(
			'relative grid size-10 place-items-center rounded-shell text-muted-foreground outline-0 hover:bg-hover hover:text-foreground',
			isOpen && 'bg-pink-deep/12 text-pink-deep hover:text-pink-deep'
		)}
		onclick={() => (isOpen = true)}
	>
		<Settings2Icon class="size-5" />
	</Tooltip.Trigger>
	<Tooltip.Content side="right">Settings</Tooltip.Content>
</Tooltip.Root>

<SettingsDialog bind:open={isOpen} />
