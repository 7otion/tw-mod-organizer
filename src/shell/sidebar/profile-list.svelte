<script lang="ts">
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import { DragOrder } from '@/lib/drag-order.svelte';
	import type { Profile } from '@/lib/models';
	import { ProfilesStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	import DeleteProfileDialog from './delete-profile-dialog.svelte';
	import NewProfileDialog from './new-profile-dialog.svelte';
	import ProfileItem from './profile-item.svelte';
	import SidebarHeading from './sidebar-heading.svelte';

	const profilesStore = ProfilesStore.get();

	const order = new DragOrder(
		() => profilesStore.list,
		(profile) => profile.id,
		(ids) => profilesStore.reorder(ids)
	);

	let isCreating = $state(false);
	let deleting = $state<Profile | null>(null);
</script>

<div class="flex flex-col pt-4 pb-1.5">
	<SidebarHeading
		title="PROFILES"
		tooltip="New profile"
		onclick={() => (isCreating = true)}
	>
		<PlusIcon class="size-3.5" />
		New
	</SidebarHeading>
	<ul class="flex flex-col gap-px">
		<DragDropProvider
			modifiers={[RestrictToVerticalAxis]}
			onDragOver={(event) => order.over(event)}
			onDragEnd={(event) => order.end(event.canceled).catch(toastError)}
		>
			{#each order.items as profile, index (profile.id)}
				{@const active = profile === profilesStore.active}
				<ProfileItem
					{profile}
					{index}
					{active}
					isNameTaken={(name) =>
						profilesStore.isNameTaken(name, profile)}
					onactivate={() =>
						!active &&
						profilesStore.activate(profile).catch(toastError)}
					onrename={(name) => profilesStore.rename(profile, name)}
					ondelete={() => (deleting = profile)}
				/>
			{/each}
		</DragDropProvider>
	</ul>
</div>

<NewProfileDialog bind:open={isCreating} />
<DeleteProfileDialog bind:profile={deleting} />
