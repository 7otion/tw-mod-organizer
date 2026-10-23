<script lang="ts">
	import NameDialog from '@/components/name-dialog.svelte';

	import { t } from '@/lib/i18n';
	import type { Mod, TagColor } from '@/lib/models';
	import { LibraryStore, TagsStore } from '@/lib/store';

	type Props = {
		open: boolean;
		mods: readonly Mod[];
	};

	let { open = $bindable(false), mods }: Props = $props();

	const libraryStore = LibraryStore.get();
	const tagsStore = TagsStore.get();

	async function create(name: string, color: TagColor): Promise<void> {
		const tag = await tagsStore.create(name, color);
		await libraryStore.setTag(mods, tag, true);
	}
</script>

<NameDialog
	bind:open
	id="new-tag"
	kind="tag"
	title={t('library.newTag.title')}
	description={t('library.newTag.description', { count: mods.length })}
	nameLabel={t('library.newTag.name')}
	submitLabel={t('library.newTag.create')}
	isTaken={(name) => tagsStore.isNameTaken(name)}
	hasColor
	oncreate={create}
/>
