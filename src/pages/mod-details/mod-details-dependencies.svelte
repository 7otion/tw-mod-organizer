<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ImageOffIcon from '@lucide/svelte/icons/image-off';
	import PuzzleIcon from '@lucide/svelte/icons/puzzle';

	import { Button } from '@/components/ui/button';
	import * as ContextMenu from '@/components/ui/context-menu';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import {
		LibraryStore,
		ProfilesStore,
		WorkshopDownloadsStore,
		type Requirement,
	} from '@/lib/store';
	import { cn } from '@/lib/utils';
	import ModContextMenuItems from '@/pages/library/mod-context-menu-items.svelte';
	import ModCover from '@/pages/library/mod-cover.svelte';

	type Props = {
		mod: Mod;
		onopen: (mod: Mod) => void;
	};

	type Status = 'on' | 'off' | 'absent';

	let { mod, onopen }: Props = $props();

	const libraryStore = LibraryStore.get();
	const profilesStore = ProfilesStore.get();
	const downloadsStore = WorkshopDownloadsStore.get();

	let isSubscribing = $state(false);

	const dependencies = $derived(libraryStore.dependenciesOf(mod));
	const missing = $derived(
		dependencies.requires.filter((requirement) => requirement.mod === null)
	);
	const offCount = $derived(
		dependencies.requires.filter(
			(requirement) =>
				requirement.mod !== null && statusOf(requirement.mod) !== 'on'
		).length
	);
	const activeName = $derived(profilesStore.active?.name ?? '');

	function statusOf(other: Mod): Status {
		const entry = libraryStore
			.placementOf(other)
			.profiles.find(({ profile }) => profile === profilesStore.active);
		if (!entry) return 'absent';
		return entry.isEnabled ? 'on' : 'off';
	}

	function statusText(other: Mod): string {
		const status = statusOf(other);
		if (status === 'on') return t('modDetails.dependencies.on');
		if (status === 'off')
			return t('modDetails.dependencies.off', { profile: activeName });
		return t('modDetails.dependencies.absent', { profile: activeName });
	}

	async function subscribe(
		requirements: readonly Requirement[]
	): Promise<void> {
		isSubscribing = true;
		try {
			await downloadsStore.subscribe(
				requirements.map(({ dependency }) => ({
					source_ref: dependency.required_ref,
					title: dependency.required_title ?? dependency.required_ref,
				}))
			);
		} finally {
			isSubscribing = false;
		}
	}
</script>

{#snippet row(other: Mod)}
	{@const status = statusOf(other)}
	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				<div
					{...props}
					class="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-fill-1"
				>
					<button
						type="button"
						class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
						onclick={() => onopen(other)}
					>
						<ModCover mod={other} size="compact" />
						<span class="flex min-w-0 flex-1 flex-col leading-snug">
							<b class="truncate font-semibold">
								{other.displayTitle}
							</b>
							<span
								class={cn(
									'text-xs',
									status === 'on'
										? 'text-muted-foreground'
										: 'text-status-warn'
								)}
							>
								{statusText(other)}
							</span>
						</span>
						{#if status === 'on'}
							<ChevronRightIcon
								class="size-4 shrink-0 text-muted-foreground"
							/>
						{/if}
					</button>
					{#if status !== 'on'}
						<Button variant="secondary" size="sm">
							{t('modDetails.dependencies.enable')}
						</Button>
					{/if}
				</div>
			{/snippet}
		</ContextMenu.Trigger>
		<ContextMenu.Content class="min-w-52">
			<ModContextMenuItems mod={other} />
		</ContextMenu.Content>
	</ContextMenu.Root>
{/snippet}

{#if missing.length || offCount}
	<div
		class="flex items-center gap-2 rounded-lg bg-status-dep/8 px-3 py-2 text-sm text-foreground-2"
	>
		<PuzzleIcon class="size-4 shrink-0 text-status-dep" />
		<span class="flex-1">
			{#if missing.length}
				{t('modDetails.dependencies.summaryMissing', {
					count: missing.length,
				})}
			{/if}
			{#if offCount}
				{t('modDetails.dependencies.summaryOff', { count: offCount })}
			{/if}
		</span>
		{#if missing.length}
			<Button
				size="sm"
				disabled={isSubscribing}
				onclick={() => subscribe(missing)}
			>
				{t('modDetails.dependencies.subscribeMissing')}
			</Button>
		{/if}
	</div>
{/if}

<section>
	<h3 class="mb-1.5 text-sm font-semibold text-status-dep">
		{t('modDetails.dependencies.requires')}
	</h3>
	{#each dependencies.requires as requirement (requirement.dependency.id)}
		{#if requirement.mod}
			{@render row(requirement.mod)}
		{:else}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet child({ props })}
						<div
							{...props}
							class="flex min-h-11 items-center gap-2 rounded-lg bg-status-missing/8 px-2 py-1.5 text-sm"
						>
							<span
								class="grid size-thumb-compact shrink-0 place-items-center rounded-sm bg-fill-1 text-foreground-4"
							>
								<ImageOffIcon class="size-3.5" />
							</span>
							<span
								class="flex min-w-0 flex-1 flex-col leading-snug"
							>
								<b class="truncate font-semibold">
									{requirement.dependency.required_title ??
										t(
											'modDetails.dependencies.unknownTitle',
											{
												id: requirement.dependency
													.required_ref,
											}
										)}
								</b>
								<span class="text-xs text-status-missing">
									{t('modDetails.dependencies.notInLibrary')}
								</span>
							</span>
							<Button
								variant="secondary"
								size="sm"
								disabled={isSubscribing}
								onclick={() => subscribe([requirement])}
							>
								{t('modDetails.dependencies.subscribe')}
							</Button>
						</div>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Content class="min-w-52">
					<ModContextMenuItems
						steamRef={requirement.dependency.required_ref}
					/>
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/if}
	{:else}
		<p class="text-sm text-muted-foreground">
			{t('modDetails.dependencies.noRequirements')}
		</p>
	{/each}
</section>

<section>
	<h3 class="mb-1.5 text-sm font-semibold text-muted-foreground">
		{t('modDetails.dependencies.requiredBy')}
	</h3>
	{#each dependencies.requiredBy as other (other.id)}
		{@render row(other)}
	{:else}
		<p class="text-sm text-muted-foreground">
			{t('modDetails.dependencies.notRequired')}
		</p>
	{/each}
</section>

<p class="text-sm text-muted-foreground">{t('modDetails.dependencies.hint')}</p>
