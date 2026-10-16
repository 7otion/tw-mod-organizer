<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	import { buttonVariants } from '@/components/ui/button';
	import * as Tooltip from '@/components/ui/tooltip';
	import { cn } from '@/lib/utils';
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		aria-haspopup="dialog"
		class={cn(
			buttonVariants({ variant: 'ghost' }),
			'clickable-content h-auto w-sidebar justify-start gap-3 rounded-none border-0 border-r border-border bg-panel px-0 pe-3 text-left hover:bg-hover dark:hover:bg-hover'
		)}
	>
		<img src="/tww3.jpg" alt="Game Logo" class="h-full w-20 object-cover" />
		<span class="flex flex-1 flex-col leading-[1.15]">
			<small
				class="font-engraved text-3xs tracking-[0.24em] text-muted-foreground"
			>
				TOTAL WAR
			</small>
			<span class="font-engraved text-md font-bold tracking-[0.12em]">
				WARHAMMER III
			</span>
		</span>
		<ChevronDownIcon class="size-3.5 text-muted-foreground" />
	</Tooltip.Trigger>
	<Tooltip.Content side="bottom">Change game (Ctrl+G)</Tooltip.Content>
</Tooltip.Root>
