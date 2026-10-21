<script lang="ts">
	import { convertFileSrc } from '@tauri-apps/api/core';
	import type { Snippet } from 'svelte';
	import ImageOffIcon from '@lucide/svelte/icons/image-off';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';

	type Props = {
		mod: Mod;
		children: Snippet;
	};

	let { mod, children }: Props = $props();

	let failedSource = $state<string | null>(null);

	const source = $derived.by(() => {
		if (mod.coverFile) return convertFileSrc(mod.coverFile);
		return mod.preview_url;
	});
	const isShown = $derived(source !== null && source !== failedSource);
</script>

<div
	class="relative mx-4 mt-4 aspect-square shrink-0 overflow-hidden rounded-lg bg-fill-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
>
	{#if isShown}
		{#key source}
			<img
				src={source}
				alt=""
				class="absolute inset-0 size-full object-cover object-top"
				onerror={() => (failedSource = source)}
			/>
		{/key}
	{:else}
		<span
			class="absolute inset-0 grid place-items-center pb-[35%] text-foreground-4"
		>
			<ImageOffIcon class="size-6" />
		</span>
	{/if}
	<span
		class="absolute top-2.5 left-2.5 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-foreground"
	>
		{t(`modDetails.sources.${mod.source}`)}
	</span>
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black via-black/80 to-transparent"
	></div>
	<div
		class="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]"
	>
		{@render children()}
	</div>
</div>
