<script lang="ts" module>
	import { convertFileSrc } from '@tauri-apps/api/core';
	import type { SvelteSet } from 'svelte/reactivity';

	import type { Mod } from '@/lib/models';
	import type { Thumbnail } from '@/lib/store';

	import type { CoverSize } from './mod-columns';
	import { icon, IMAGE_OFF } from './row-icons.svelte';

	export type CoverSizeShown = Exclude<CoverSize, 'none'>;

	const SIZE_CLASSES: Record<CoverSizeShown, string> = {
		compact: 'flex size-thumb-compact',
		regular: 'flex size-thumb-regular',
		large: 'flex size-thumb-large',
		huge: 'flex size-thumb-huge',
	};

	export { cover };
</script>

<script lang="ts">
	import { LibraryScanStore } from '@/lib/store';

	type Props = {
		mod: Mod;
		size: CoverSizeShown;
	};

	let { mod, size }: Props = $props();

	const libraryScanStore = LibraryScanStore.get();
</script>

{#snippet cover(
	mod: Mod,
	size: CoverSizeShown,
	thumbnail: Thumbnail | null,
	failed: SvelteSet<string>
)}
	<span class={SIZE_CLASSES[size]}>
		{#if thumbnail && !failed.has(thumbnail.file)}
			<img
				width={thumbnail.width}
				height={thumbnail.height}
				src={convertFileSrc(thumbnail.file)}
				alt=""
				loading="lazy"
				decoding="async"
				class={[
					'size-full rounded-sm object-cover object-top outline-1 -outline-offset-1 outline-white/6',
					mod.isMissing && 'opacity-40 grayscale-[0.8]',
				]}
				onerror={() => failed.add(thumbnail.file)}
			/>
		{:else}
			<span
				aria-hidden="true"
				class="grid size-full place-items-center rounded-sm bg-fill-1 text-foreground-4"
			>
				{#if mod.coverFile === null && mod.preview_url === null}
					{@render icon(IMAGE_OFF, 'size-3.5')}
				{/if}
			</span>
		{/if}
	</span>
{/snippet}

{@render cover(
	mod,
	size,
	libraryScanStore.thumbnails.get(mod.id) ?? null,
	libraryScanStore.failedThumbnails
)}
