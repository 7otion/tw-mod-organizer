<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import CircleArrowUpIcon from '@lucide/svelte/icons/circle-arrow-up';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';

	import { Button } from '@/components/ui/button';

	import { formatDate, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import type { Mod } from '@/lib/models';
	import { LibraryStore } from '@/lib/store';

	let { mod }: { mod: Mod } = $props();

	const libraryStore = LibraryStore.get();

	const CHANGE_NOTES_URL =
		'https://steamcommunity.com/sharedfiles/filedetails/changelog/';
</script>

<div
	class="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-fill-1 px-3 py-2 text-sm text-foreground-2"
>
	<CircleArrowUpIcon class="size-4 shrink-0 text-status-update" />
	<span class="min-w-0 flex-1 truncate">
		<Message
			key="modDetails.update.text"
			values={{
				updated: formatDate(mod.remote_updated_at!),
				seen: formatDate(mod.seen_updated_at!),
			}}
		>
			{#snippet value(text, name)}
				{#if name === 'updated'}
					<b class="font-semibold text-status-update">{text}</b>
				{:else}
					{text}
				{/if}
			{/snippet}
		</Message>
	</span>
	{#if mod.source === 'steam'}
		<Button
			variant="ghost"
			size="sm"
			class="shrink-0"
			onclick={() => openUrl(`${CHANGE_NOTES_URL}${mod.source_ref}`)}
		>
			<ScrollTextIcon />
			{t('modDetails.update.changeNotes')}
		</Button>
	{/if}
	<Button
		variant="secondary"
		size="sm"
		class="shrink-0"
		onclick={() => libraryStore.markSeen(mod)}
	>
		{t('modDetails.update.markSeen')}
	</Button>
</div>
