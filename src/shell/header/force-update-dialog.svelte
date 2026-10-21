<script lang="ts">
	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { formatSize, t } from '@/lib/i18n';
	import { LibraryStore, WorkshopDownloadsStore } from '@/lib/store';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const libraryStore = LibraryStore.get();
	const downloadsStore = WorkshopDownloadsStore.get();

	const mods = $derived(
		libraryStore.list.filter(
			(mod) => mod.source === 'steam' && !mod.isMissing
		)
	);
	const totalSize = $derived(
		mods.reduce((sum, mod) => sum + (mod.size_bytes ?? 0), 0)
	);

	async function update(): Promise<void> {
		open = false;
		await downloadsStore.forceUpdate(
			mods.map((mod) => ({
				source_ref: mod.source_ref,
				title: mod.displayTitle,
				installed_updated_at: mod.installed_updated_at
					? Math.floor(mod.installed_updated_at.getTime() / 1000)
					: null,
			}))
		);
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('library.forceUpdate.title', { count: mods.length })}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('library.forceUpdate.description', {
					size: formatSize(totalSize),
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action disabled={!mods.length} onclick={update}>
				{t('library.forceUpdate.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
