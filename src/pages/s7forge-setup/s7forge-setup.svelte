<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';

	import { Button } from '@/components/ui/button';
	import { Progress } from '@/components/ui/progress';

	import { S7forgeStore } from '@/lib/store';

	const s7forgeStore = S7forgeStore.get();

	const progress = $derived(s7forgeStore.downloadProgress);

	function megabytes(bytes: number): string {
		return (bytes / 1024 / 1024).toFixed(1);
	}
</script>

<main
	class="flex flex-1 flex-col items-center justify-center bg-background px-18"
>
	<div class="flex w-full max-w-2xl flex-col gap-6">
		<h1 class="font-blackletter text-[72px] leading-none">
			One last piece
		</h1>
		<p class="text-lg leading-relaxed text-foreground-2">
			TMO talks to Steam through s7forge, a small helper that starts only
			when it's needed, so Steam never thinks your game is running. It's
			downloaded once from GitHub and kept up to date.
		</p>

		{#if s7forgeStore.isInstalling}
			<div class="flex flex-col gap-2">
				<Progress
					value={progress
						? (progress.received / progress.total) * 100
						: 0}
				/>
				<span class="text-cyan-200">
					{#if progress}
						Downloading… {megabytes(progress.received)} of
						{megabytes(progress.total)} MB
					{:else}
						Finding the latest version…
					{/if}
				</span>
			</div>
		{:else}
			<Button
				size="lg"
				class="self-start"
				onclick={() => s7forgeStore.install()}
			>
				<DownloadIcon />
				Download s7forge
			</Button>
		{/if}
	</div>
</main>
