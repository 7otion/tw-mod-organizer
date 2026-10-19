<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';

	import { Button } from '@/components/ui/button';
	import { Progress } from '@/components/ui/progress';

	import { t } from '@/lib/i18n';
	import { S7forgeStore } from '@/lib/store';

	const s7forgeStore = S7forgeStore.get();

	const progress = $derived(s7forgeStore.downloadProgress);

	function megabytes(bytes: number): number {
		return Math.round((bytes / 1024 / 1024) * 10) / 10;
	}
</script>

<main
	class="flex flex-1 flex-col items-center justify-center bg-background px-18"
>
	<div class="flex w-full max-w-2xl flex-col gap-6">
		<h1 class="font-blackletter text-[72px] leading-none">
			{t('s7forgeSetup.title')}
		</h1>
		<p class="text-lg leading-relaxed text-foreground-2">
			{t('s7forgeSetup.description')}
		</p>

		{#if s7forgeStore.isInstalling}
			<div class="flex flex-col gap-2">
				<Progress
					value={progress
						? (progress.received / progress.total) * 100
						: 0}
				/>
				<span class="text-cyan-200">
					{progress
						? t('s7forgeSetup.downloading', {
								received: megabytes(progress.received),
								total: megabytes(progress.total),
							})
						: t('s7forgeSetup.finding')}
				</span>
			</div>
		{:else}
			<Button
				size="lg"
				class="self-start"
				onclick={() => s7forgeStore.install()}
			>
				<DownloadIcon />
				{t('s7forgeSetup.download')}
			</Button>
		{/if}
	</div>
</main>
