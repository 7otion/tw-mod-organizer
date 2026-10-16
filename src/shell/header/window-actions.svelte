<script lang="ts">
	import CopyIcon from '@lucide/svelte/icons/copy';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import SquareIcon from '@lucide/svelte/icons/square';
	import XIcon from '@lucide/svelte/icons/x';
	import { getCurrentWindow } from '@tauri-apps/api/window';

	import { Button } from '@/components/ui/button';

	import { AppStore } from '@/lib/store';

	const appWindow = getCurrentWindow();
	const appStore = AppStore.get();
</script>

<div class="clickable-content ml-auto flex">
	<Button
		variant="ghost"
		class="h-full w-[46px] rounded-none text-foreground hover:bg-primary/15"
		onclick={() => appWindow.minimize()}
		aria-label="Minimize"
	>
		<MinusIcon class="size-4" />
	</Button>
	<Button
		variant="ghost"
		class="h-full w-[46px] rounded-none text-foreground hover:bg-primary/15"
		onclick={() => appWindow.toggleMaximize()}
		aria-label={appStore.isMaximized ? 'Restore' : 'Maximize'}
	>
		{#if appStore.isMaximized}
			<CopyIcon class="size-3.5" />
		{:else}
			<SquareIcon class="size-3.5" />
		{/if}
	</Button>
	<Button
		variant="ghost"
		class="h-full w-[46px] rounded-none text-foreground hover:bg-destructive hover:text-foreground dark:hover:bg-destructive"
		onclick={() => appWindow.close()}
		aria-label="Close"
	>
		<XIcon class="size-4" />
	</Button>
</div>
