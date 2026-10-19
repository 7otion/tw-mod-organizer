<script lang="ts">
	import { Count } from '@7otion-tauri/orm';

	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { t } from '@/lib/i18n';
	import { type Profile, ProfileEntry } from '@/lib/models';
	import { ProfilesStore } from '@/lib/store';

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
		await profilesStore.delete(profile!);
		profile = null;
	}
</script>

<AlertDialog.Root
	open={profile !== null}
	onOpenChange={(isOpen) => !isOpen && (profile = null)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('profiles.delete.title', { name: profile?.name ?? '' })}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('profiles.delete.contents', {
					mods: t('profiles.delete.mods', { count: mods.current }),
					separators: t('profiles.delete.separators', {
						count: separators.current,
					}),
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				{t('profiles.delete.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
