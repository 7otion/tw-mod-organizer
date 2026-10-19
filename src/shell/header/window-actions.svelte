<script lang="ts">
	import CopyIcon from '@lucide/svelte/icons/copy';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import SquareIcon from '@lucide/svelte/icons/square';
	import XIcon from '@lucide/svelte/icons/x';
	import { getCurrentWindow } from '@tauri-apps/api/window';

	import { Button } from '@/components/ui/button';

	import { t } from '@/lib/i18n';
	import { AppStore } from '@/lib/store';

	const appWindow = getCurrentWindow();
	const appStore = AppStore.get();
</script>

<div class="clickable-content ml-auto flex">
	<Button
		variant="ghost"
		class="h-full w-[46px] rounded-none text-foreground hover:bg-pink-deep/15"
		onclick={() => appWindow.minimize()}
		aria-label={t('window.minimize')}
	>
		<MinusIcon class="size-4" />
	</Button>
	<Button
		variant="ghost"
		class="h-full w-[46px] rounded-none text-foreground hover:bg-pink-deep/15"
		onclick={() => appWindow.toggleMaximize()}
		aria-label={appStore.isMaximized
			? t('window.restore')
			: t('window.maximize')}
	>
		{#if appStore.isMaximized}
			<CopyIcon class="size-3.5" />
		{:else}
			<SquareIcon class="size-3.5" />
		{/if}
	</Button>
	<Button
		variant="ghost"
		class="h-full w-[46px] rounded-none text-foreground hover:bg-gem-blood-deep hover:text-foreground dark:hover:bg-gem-blood-deep"
		onclick={() => appWindow.close()}
		aria-label={t('window.close')}
	>
		<XIcon class="size-4" />
	</Button>
</div>
