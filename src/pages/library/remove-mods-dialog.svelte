<script lang="ts">
	import * as AlertDialog from '@/components/ui/alert-dialog';

	import type { Mod } from '@/lib/models';
	import { LibraryStore } from '@/lib/store';

	type Props = {
		open: boolean;
		mods: readonly Mod[];
		onremoved: () => void;
	};

	let { open = $bindable(false), mods, onremoved }: Props = $props();

	const libraryStore = LibraryStore.get();

	const steamCount = $derived(
		mods.filter((mod) => !mod.isMissing && mod.source === 'steam').length
	);
	const localCount = $derived(
		mods.filter((mod) => !mod.isMissing && mod.source !== 'steam').length
	);
	const missingCount = $derived(mods.filter((mod) => mod.isMissing).length);

	function plural(count: number): string {
		return count === 1 ? 'mod' : 'mods';
	}

	async function remove(): Promise<void> {
		await libraryStore.remove(mods);
		onremoved();
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				Unsubscribe / remove {mods.length}
				{plural(mods.length)}?
			</AlertDialog.Title>
			<AlertDialog.Description>
				<ul class="flex list-disc flex-col gap-1 pl-4">
					{#if steamCount}
						<li>
							{steamCount} Steam {plural(steamCount)}:
							unsubscribed. They stay in the library as missing,
							so profiles keep their place.
						</li>
					{/if}
					{#if localCount}
						<li>
							{localCount} local {plural(localCount)}: the folder
							goes to the Recycle Bin. They stay in the library as
							missing.
						</li>
					{/if}
					{#if missingCount}
						<li>
							{missingCount} missing {plural(missingCount)}:
							removed from the library and from every profile and
							group that lists them.
						</li>
					{/if}
				</ul>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				Unsubscribe / remove
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
