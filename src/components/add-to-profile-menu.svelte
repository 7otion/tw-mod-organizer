<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import { activeDot } from '@/components/dots.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import type { Mod, Profile } from '@/lib/models';
	import { LibraryStore, LoadOrderStore, ProfilesStore } from '@/lib/store';

	let { mods }: { mods: readonly Mod[] } = $props();

	const libraryStore = LibraryStore.get();
	const loadOrderStore = LoadOrderStore.get();
	const profilesStore = ProfilesStore.get();

	function countIn(profile: Profile): number {
		return mods.filter((mod) => libraryStore.isInProfile(mod, profile))
			.length;
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="pink"
				size="sm"
				class="bg-pink text-pink-ink hover:bg-pink-hover"
			>
				<PlusIcon />
				{t('library.bulk.addToProfile')}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" class="min-w-52">
		{#each profilesStore.list as profile (profile.id)}
			{@const count = countIn(profile)}
			<DropdownMenu.CheckboxItem
				checked={count > 0 && count === mods.length}
				indeterminate={count > 0 && count < mods.length}
				closeOnSelect={false}
				onCheckedChange={(isChecked) =>
					loadOrderStore.setMembership(profile, mods, isChecked)}
			>
				{@render activeDot(profile === profilesStore.active)}
				{profile.name}
			</DropdownMenu.CheckboxItem>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
