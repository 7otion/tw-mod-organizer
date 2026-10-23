<script lang="ts">
	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { t } from '@/lib/i18n';
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
	const kind = $derived(
		steamCount && !localCount && !missingCount
			? 'unsubscribe'
			: steamCount
				? 'mixed'
				: 'remove'
	);

	async function remove(): Promise<void> {
		await libraryStore.remove(mods);
		onremoved();
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t(`library.remove.title.${kind}`, { count: mods.length })}
			</AlertDialog.Title>
			<AlertDialog.Description>
				<ul class="flex list-disc flex-col gap-1 pl-4">
					{#if steamCount}
						<li>
							{t('library.remove.steam', { count: steamCount })}
						</li>
					{/if}
					{#if localCount}
						<li>
							{t('library.remove.local', { count: localCount })}
						</li>
					{/if}
					{#if missingCount}
						<li>
							{t('library.remove.missing', {
								count: missingCount,
							})}
						</li>
					{/if}
				</ul>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={remove}>
				{t(`library.remove.confirm.${kind}`)}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
