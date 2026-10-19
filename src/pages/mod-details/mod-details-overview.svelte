<script lang="ts">
	import LinkIcon from '@lucide/svelte/icons/link';
	import { openUrl } from '@tauri-apps/plugin-opener';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore, ProfilesStore } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import { readDescription } from './description';

	let { mod }: { mod: Mod } = $props();

	const libraryStore = LibraryStore.get();
	const profilesStore = ProfilesStore.get();

	const paragraphs = $derived(readDescription(mod.description ?? ''));
	const placement = $derived(libraryStore.placementOf(mod));
</script>

{#if paragraphs.length}
	<div class="flex flex-col gap-2 text-md leading-relaxed text-foreground-2">
		{#each paragraphs as paragraph, index (index)}
			<p class="whitespace-pre-line">
				{#each paragraph as part, partIndex (partIndex)}
					{#if part.url}
						{@const url = part.url}
						<button
							type="button"
							class="cursor-pointer text-foreground underline decoration-white/30 underline-offset-3 hover:decoration-white/60"
							onclick={() => openUrl(url)}
						>
							{part.text}
						</button>
					{:else}
						{part.text}
					{/if}
				{/each}
			</p>
		{/each}
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
</section>
