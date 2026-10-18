<script lang="ts">
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { openUrl } from '@tauri-apps/plugin-opener';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import { ScrollArea } from '@/components/ui/scroll-area';

	import { toastError } from '@/lib/utils';

	import { LICENCES } from './licences';

	const GPL_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';

	let { open = $bindable(false) }: { open: boolean } = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title>Licences</Dialog.Title>
			<Dialog.Description>
				TW Mod Organizer is free software under the GNU General Public
				License v3.0. It's built on these open-source projects.
			</Dialog.Description>
		</Dialog.Header>

		<ScrollArea class="-mx-5 h-[min(420px,50vh)]">
			<div class="flex flex-col gap-5 px-5">
				{#each LICENCES as { group, items } (group)}
					<section class="flex flex-col">
						<p
							class="mb-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground after:h-px after:flex-1 after:bg-border"
						>
							{group}
						</p>
						{#each items as item (item.name)}
							<div
								class="flex items-center justify-between gap-4 py-1.5"
							>
								<span class="truncate">{item.name}</span>
								<span
									class="shrink-0 font-mono text-xs text-muted-foreground"
								>
									{item.licence}
								</span>
							</div>
						{/each}
					</section>
				{/each}
			</div>
		</ScrollArea>

		<Dialog.Footer>
			<Button
				variant="ghost"
				onclick={() => openUrl(GPL_URL).catch(toastError)}
			>
				<ExternalLinkIcon />
				Read the GPL v3.0
			</Button>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>Close</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
