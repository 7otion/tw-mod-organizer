<script lang="ts" module>
	export type DetailsContext = 'library' | 'load-order';
</script>

<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';

	import Drawer from '@/components/drawer.svelte';
	import { Button } from '@/components/ui/button';

	import { formatSize, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import RenameModDialog from '@/lib/mod-table/rename-mod-dialog.svelte';
	import type { Mod } from '@/lib/models';
	import { LibraryStore, UiStateStore, type UiStateField } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import ModDetailsActions from './mod-details-actions.svelte';
	import ModDetailsCover from './mod-details-cover.svelte';
	import ModDetailsDependencies from './mod-details-dependencies.svelte';
	import ModDetailsInfo from './mod-details-info.svelte';
	import ModDetailsMenu from './mod-details-menu.svelte';
	import ModDetailsOverview from './mod-details-overview.svelte';
	import ModDetailsTags from './mod-details-tags.svelte';
	import ModDetailsTitle from './mod-details-title.svelte';
	import ModDetailsUpdate from './mod-details-update.svelte';

	type Tab = (typeof TABS)[number];

	type Props = {
		mod: Mod;
		context: DetailsContext;
		onopen: (mod: Mod) => void;
		onclose: () => void;
	};

	const TABS = ['overview', 'info', 'conflicts', 'dependencies'] as const;

	const TAB_FIELD: UiStateField<Tab> = {
		key: 'mod_details.tab',
		initial: 'overview',
		is: (value): value is Tab => TABS.some((tab) => tab === value),
	};

	let { mod, context, onopen, onclose }: Props = $props();

	const libraryStore = LibraryStore.get();
	const uiStateStore = UiStateStore.get();

	let renaming = $state.raw<Mod | null>(null);

	const tabs = $derived(
		TABS.filter((tab) => tab !== 'conflicts' || context === 'load-order')
	);
	const tab = $derived.by(() => {
		const stored = uiStateStore.get(TAB_FIELD);
		return tabs.includes(stored) ? stored : 'overview';
	});
	const dependencies = $derived(libraryStore.dependenciesOf(mod));
	const missingCount = $derived(
		libraryStore.missingRequirementsOf(mod).length
	);
	const placement = $derived(libraryStore.placementOf(mod));
	const firstProfile = $derived(placement.profiles[0] ?? null);
	const otherProfiles = $derived(
		placement.profiles.slice(1).map(({ profile }) => profile.name)
	);
</script>

<Drawer label={t('modDetails.title')}>
	<div class="flex h-11 shrink-0 items-center gap-2 border-b pr-2 pl-4">
		<span class="text-sm font-semibold text-muted-foreground">
			{t('modDetails.title')}
		</span>
		<span class="flex-1"></span>
		<ModDetailsMenu {mod} onrename={() => (renaming = mod)} />
		<Button
			variant="ghost"
			size="icon-sm"
			class="size-7.5"
			aria-label={t('modDetails.close')}
			onclick={onclose}
		>
			<XIcon />
		</Button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		<ModDetailsCover {mod}>
			<ModDetailsTitle {mod} onrename={() => (renaming = mod)} />
			<p class="text-sm text-foreground-2">
				{#if mod.author_name}
					<Message
						key="modDetails.byline.author"
						values={{ name: mod.author_name }}
					>
						{#snippet value(text)}
							<b class="font-semibold text-foreground">{text}</b>
						{/snippet}
					</Message>
					·
				{/if}
				{#if mod.size_bytes !== null}
					<b class="font-semibold text-foreground">
						{formatSize(mod.size_bytes)}
					</b>
					·
				{/if}
				{#if firstProfile}
					{t('modDetails.byline.number', {
						number: firstProfile.number,
						profile: firstProfile.profile.name,
					})}
					{#if otherProfiles.length}
						· {t('modDetails.byline.alsoIn', {
							profiles: otherProfiles.join(', '),
						})}
					{/if}
				{:else}
					{t('modDetails.byline.inNoProfile')}
				{/if}
			</p>
			<ModDetailsActions {mod} />
		</ModDetailsCover>
		{#if mod.hasUnseenUpdate}
			<ModDetailsUpdate {mod} />
		{/if}
		<ModDetailsTags {mod} />

		<div role="tablist" class="mt-4 flex gap-1 border-b px-4">
			{#each tabs as option (option)}
				{@const isSelected = option === tab}
				<button
					type="button"
					role="tab"
					aria-selected={isSelected}
					class={cn(
						'relative flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm font-bold text-muted-foreground hover:text-foreground',
						isSelected &&
							'text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-foreground'
					)}
					onclick={() => uiStateStore.set(TAB_FIELD, option)}
				>
					{t(`modDetails.tabs.${option}`)}
					{#if option === 'dependencies' && dependencies.requires.length}
						<small
							class={cn(
								'text-xs font-semibold',
								missingCount
									? 'text-status-dep'
									: 'text-muted-foreground'
							)}
						>
							{dependencies.requires.length}
						</small>
					{/if}
				</button>
			{/each}
		</div>

		<div class="flex flex-col gap-4 p-4">
			{#if tab === 'overview'}
				<ModDetailsOverview {mod} />
			{:else if tab === 'info'}
				<ModDetailsInfo {mod} />
			{:else if tab === 'dependencies'}
				<ModDetailsDependencies {mod} {onopen} />
			{/if}
		</div>
	</div>
</Drawer>

<RenameModDialog bind:mod={renaming} />
