<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import LinkIcon from '@lucide/svelte/icons/link';

	import AddToGroupMenu from '@/components/add-to-group-menu.svelte';
	import { activeDot } from '@/components/dots.svelte';

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
	<h3 class="mb-2 text-sm font-semibold text-muted-foreground">
		{t('modDetails.overview.inProfiles')}
	</h3>
	<ul class="flex flex-col gap-1">
		{#each placement.profiles as { profile, isEnabled, number } (profile.id)}
			<li
				class="flex h-9 items-center gap-2.5 rounded-lg bg-fill-1 pr-1.5 pl-3 text-md"
			>
				{@render activeDot(profile === profilesStore.active)}
				<span
					class="min-w-0 flex-1 truncate font-semibold text-foreground"
				>
					{profile.name}
				</span>
				<span
					class="rounded-md px-2 py-0.5 font-mono text-orange-100 tabular-nums"
				>
					{t('modDetails.overview.number', { number })}
				</span>
				<span
					class={cn(
						'min-w-11 rounded-md px-2 py-0.5 text-center text-sm font-semibold',
						isEnabled
							? 'bg-status-ok/15 text-status-ok'
							: 'bg-fill-2 text-muted-foreground'
					)}
				>
					{isEnabled ? t('common.on') : t('common.off')}
				</span>
			</li>
		{/each}
		{#each placement.groups as { group, profiles } (group.id)}
			<li
				class="flex h-9 items-center gap-2.5 rounded-lg bg-fill-1 pr-3 pl-3 text-md"
			>
				<LinkIcon class="size-3.5 shrink-0 text-status-dep" />
				<span class="min-w-0 truncate font-semibold text-foreground">
					{group.name}
				</span>
				<span class="min-w-0 flex-1 truncate text-sm text-foreground-2">
					{t('modDetails.overview.viaGroup', {
						profiles: profiles
							.map((profile) => profile.name)
							.join(', '),
					})}
				</span>
			</li>
		{/each}
	</ul>
	{#if !placement.profiles.length && !placement.groups.length}
		<p class="text-sm text-muted-foreground">
			{t('modDetails.overview.noProfiles')}
		</p>
	{/if}
	<div class="mt-2">
		<AddToGroupMenu mods={[mod]} variant="secondary" size="sm" />
	</div>
</section>
