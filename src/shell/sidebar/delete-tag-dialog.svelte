<script lang="ts">
	import { Count } from '@7otion-tauri/orm';

	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { ModTag, type Tag } from '@/lib/models';
	import { TagsStore } from '@/lib/store';

	let { tag = $bindable(null) }: { tag: Tag | null } = $props();

	const tagsStore = TagsStore.get();

	const modCount = new Count(() =>
		ModTag.query().where('tag_id', tag?.id ?? 0)
	);

	async function remove(): Promise<void> {
		await tagsStore.delete(tag!);
		tag = null;
	}
</script>

<AlertDialog.Root
	open={tag !== null}
	onOpenChange={(isOpen) => !isOpen && (tag = null)}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{tag?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				It's removed from {modCount.current}
				{modCount.current === 1 ? 'mod' : 'mods'}. The mods stay in your
				library.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				Delete tag
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
