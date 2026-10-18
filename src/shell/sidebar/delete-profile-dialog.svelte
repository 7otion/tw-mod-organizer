<script lang="ts">
	import { Count } from '@7otion-tauri/orm';

	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { type Profile, ProfileEntry } from '@/lib/models';
	import { ProfilesStore } from '@/lib/store';
	import { toastError } from '@/lib/utils';

	let { profile = $bindable(null) }: { profile: Profile | null } = $props();

	const profilesStore = ProfilesStore.get();

	const mods = new Count(() =>
		ProfileEntry.query()
			.where('profile_id', profile?.id ?? 0)
			.whereNotNull('mod_id')
	);
	const separators = new Count(() =>
		ProfileEntry.query()
			.where('profile_id', profile?.id ?? 0)
			.whereNotNull('separator_id')
	);

	async function remove(): Promise<void> {
		if (!profile) return;
		await profilesStore.delete(profile).catch(toastError);
		profile = null;
	}
</script>

<AlertDialog.Root
	open={profile !== null}
	onOpenChange={(isOpen) => !isOpen && (profile = null)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{profile?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				{mods.current}
				{mods.current === 1 ? 'mod' : 'mods'} and {separators.current}
				{separators.current === 1 ? 'separator' : 'separators'}. The
				mods stay in your library and other profiles.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				Delete profile
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
