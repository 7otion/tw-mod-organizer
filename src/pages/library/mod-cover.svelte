<script lang="ts">
	import ImageOffIcon from '@lucide/svelte/icons/image-off';
	import { convertFileSrc } from '@tauri-apps/api/core';

	import type { Mod } from '@/lib/models';
	import { LibraryStore, type CoverSize } from '@/lib/store';
	import { cn } from '@/lib/utils';

	type Props = {
		mod: Mod;
		size: Exclude<CoverSize, 'none'>;
	};

	const SIZE_CLASSES: Record<Props['size'], string> = {
		compact: 'size-thumb-compact',
		regular: 'size-thumb-regular',
		large: 'size-thumb-large',
		huge: 'size-thumb-huge',
	};

	let { mod, size }: Props = $props();

	const libraryStore = LibraryStore.get();

	let failedFile = $state<string | null>(null);

	const thumbnail = $derived(libraryStore.thumbnails[mod.id] ?? null);
	const hasCoverSource = $derived(
		mod.coverFile !== null || mod.preview_url !== null
	);
</script>

<span class={cn('flex', SIZE_CLASSES[size])}>
	{#if thumbnail && thumbnail.file !== failedFile}
		<img
			width={thumbnail.width}
			height={thumbnail.height}
			src={convertFileSrc(thumbnail.file)}
			alt=""
			loading="lazy"
			decoding="async"
			class={cn(
				'size-full rounded-sm object-cover object-top outline-1 -outline-offset-1 outline-white/6',
				mod.isMissing && 'opacity-40 grayscale-[0.8]'
			)}
			onerror={() => (failedFile = thumbnail.file)}
		/>
	{:else}
		<span
			aria-hidden="true"
			class="grid size-full place-items-center rounded-sm bg-fill-1 text-foreground-4"
		>
			{#if !hasCoverSource}
				<ImageOffIcon class="size-3.5" />
			{/if}
		</span>
	{/if}
</span>
