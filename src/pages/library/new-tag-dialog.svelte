<script lang="ts">
	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore, TagsStore } from '@/lib/store';
	import { nameError } from '@/lib/utils';

	type Props = {
		open: boolean;
		mods: readonly Mod[];
	};

	let { open = $bindable(false), mods }: Props = $props();

	const libraryStore = LibraryStore.get();
	const tagsStore = TagsStore.get();

	let name = $state('');
	let isTouched = $state(false);

	const error = $derived(nameError('tag', name, tagsStore.isNameTaken(name)));

	function reset(): void {
		name = '';
		isTouched = false;
	}

	async function create(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (error) return;
		const tag = await tagsStore.create(name);
		await libraryStore.setTag(mods, tag, true);
		open = false;
		reset();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && reset()}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>{t('library.newTag.title')}</Dialog.Title>
			<Dialog.Description>
				{t('library.newTag.description', { count: mods.length })}
			</Dialog.Description>
		</Dialog.Header>

		<form id="new-tag" onsubmit={create}>
			<Field.Field>
				<Field.Label for="tag-name"
					>{t('library.newTag.name')}</Field.Label
				>
				<Input
					id="tag-name"
					bind:value={name}
					aria-invalid={isTouched && error !== null}
					oninput={() => (isTouched = true)}
				/>
				{#if isTouched && error}
					<Field.Error>{t(error)}</Field.Error>
				{/if}
			</Field.Field>
		</form>

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost"
						>{t('common.cancel')}</Button
					>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="new-tag">
				{t('library.newTag.create')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
