<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	import type { Profile } from '@/lib/models';
	import { ProfilesStore } from '@/lib/store';

	import DeleteProfileDialog from './delete-profile-dialog.svelte';
	import NewProfileDialog from './new-profile-dialog.svelte';
	import ProfileItem from './profile-item.svelte';
	import SidebarHeadingAction from './sidebar-heading-action.svelte';
	import SidebarHeading from './sidebar-heading.svelte';

	const profilesStore = ProfilesStore.get();

	let isCreating = $state(false);
	let deleting = $state<Profile | null>(null);
</script>

<div class="flex flex-col pt-4 pb-1.5">
	<SidebarHeading title="PROFILES">
		<SidebarHeadingAction
			tooltip="New profile"
			onclick={() => (isCreating = true)}
		>
			<PlusIcon class="size-3.5" />
			New
		</SidebarHeadingAction>
	</SidebarHeading>
	<ul class="flex flex-col gap-px">
		{#each profilesStore.list as profile (profile.id)}
			<ProfileItem {profile} ondelete={() => (deleting = profile)} />
		{/each}
	</ul>
</div>

<NewProfileDialog bind:open={isCreating} />
<DeleteProfileDialog bind:profile={deleting} />
