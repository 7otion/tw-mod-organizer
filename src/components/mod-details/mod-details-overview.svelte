<script lang="ts">
	import LinkIcon from '@lucide/svelte/icons/link';
	import { openUrl } from '@tauri-apps/plugin-opener';

	import AddToGroupMenu from '@/components/add-to-group-menu.svelte';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore, ProfilesStore } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import { readDescription, type DescriptionNode } from './description';

	let { mod }: { mod: Mod } = $props();

	const libraryStore = LibraryStore.get();
	const profilesStore = ProfilesStore.get();

	const HEADING_CLASSES = {
		1: 'text-lg font-bold text-foreground',
		2: 'text-md font-bold text-foreground',
		3: 'text-md font-semibold text-foreground',
	};
	const STYLE_CLASSES = {
		bold: 'font-semibold text-foreground',
		italic: 'italic',
		underline: 'underline underline-offset-3',
		strike: 'line-through',
	};

	const blocks = $derived(readDescription(mod.description ?? ''));
	const placement = $derived(libraryStore.placementOf(mod));
</script>

{#snippet nodes(list: DescriptionNode[])}
	{#each list as node, index (index)}
		{#if node.kind === 'text'}
			{node.text}
		{:else if node.kind === 'style'}
			<span class={STYLE_CLASSES[node.style]}
				>{@render nodes(node.children)}</span
			>
		{:else if node.kind === 'link'}
			{@const url = node.url}
			<button
				type="button"
				class="cursor-pointer text-foreground underline decoration-white/30 underline-offset-3 hover:decoration-white/60"
				onclick={() => openUrl(url)}
			>
				{@render nodes(node.children)}
			</button>
		{:else if node.kind === 'paragraph'}
			<p class="whitespace-pre-line">{@render nodes(node.children)}</p>
		{:else if node.kind === 'heading'}
			<p class={cn('whitespace-pre-line', HEADING_CLASSES[node.level])}>
				{@render nodes(node.children)}
			</p>
		{:else if node.kind === 'list'}
			{#if node.isOrdered}
				<ol class="list-decimal pl-5">
					{#each node.items as item, position (position)}
						<li class="whitespace-pre-line">
							{@render nodes(item)}
						</li>
					{/each}
				</ol>
			{:else}
				<ul class="list-disc pl-5">
					{#each node.items as item, position (position)}
						<li class="whitespace-pre-line">
							{@render nodes(item)}
						</li>
					{/each}
				</ul>
			{/if}
		{:else if node.kind === 'quote'}
			<blockquote
				class="flex flex-col gap-2 border-l-2 border-line-2 pl-3 text-muted-foreground"
			>
				{#if node.author}
					<span class="text-xs font-semibold">{node.author}</span>
				{/if}
				{@render nodes(node.children)}
			</blockquote>
		{:else if node.kind === 'code'}
			<pre
				class="overflow-x-auto rounded-md bg-fill-1 p-3 font-mono text-xs whitespace-pre-wrap">{node.text}</pre>
		{:else if node.kind === 'image'}
			<img
				src={node.url}
				alt=""
				loading="lazy"
				decoding="async"
				class="max-w-full rounded-md"
			/>
		{:else if node.kind === 'rule'}
			<hr class="border-line" />
		{/if}
	{/each}
{/snippet}

{#if blocks.length}
	<div class="flex flex-col gap-2 text-md leading-relaxed text-foreground-2">
		{@render nodes(blocks)}
	</div>
{:else}
	<p class="text-sm text-muted-foreground">
		{t('modDetails.overview.noDescription')}
	</p>
{/if}

<section>
	<h3 class="mb-1.5 text-sm font-semibold text-muted-foreground">
		{t('modDetails.overview.inProfiles')}
	</h3>
	{#each placement.profiles as { profile, isEnabled, number } (profile.id)}
		<div
			class="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
		>
			<span
				class={cn(
					'size-2 shrink-0 rounded-full',
					profile === profilesStore.active
						? 'bg-pink'
						: 'shadow-[inset_0_0_0_1.5px_var(--text-4)]'
				)}
			></span>
			<span class="flex min-w-0 flex-1 flex-col leading-snug">
				<b class="truncate font-semibold">{profile.name}</b>
				<span class="text-xs text-muted-foreground">
					{isEnabled
						? t('modDetails.overview.numberOn', { number })
						: t('modDetails.overview.numberOff', { number })}
				</span>
			</span>
		</div>
	{/each}
	{#each placement.groups as { group, profiles } (group.id)}
		<div
			class="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
		>
			<LinkIcon class="size-3.5 shrink-0 text-muted-foreground" />
			<span class="flex min-w-0 flex-1 flex-col leading-snug">
				<b class="truncate font-semibold">{group.name}</b>
				<span class="text-xs text-muted-foreground">
					{t('modDetails.overview.viaGroup', {
						profiles: profiles
							.map((profile) => profile.name)
							.join(', '),
					})}
				</span>
			</span>
		</div>
	{/each}
	{#if !placement.profiles.length && !placement.groups.length}
		<p class="text-sm text-muted-foreground">
			{t('modDetails.overview.noProfiles')}
		</p>
	{/if}
	<div class="mt-2">
		<AddToGroupMenu mods={[mod]} variant="secondary" size="sm" />
	</div>
</section>
