<script lang="ts">
	import { untrack } from 'svelte';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore } from '@/lib/store';
	import { nameError } from '@/lib/utils';

	let { mod = $bindable(null) }: { mod: Mod | null } = $props();

	const libraryStore = LibraryStore.get();

	let title = $state('');
	let isTouched = $state(false);

	const error = $derived(mod ? nameError('mod', title, false) : null);

	$effect(() => {
		const current = mod;
		untrack(() => {
			title = current?.displayTitle ?? '';
			isTouched = false;
		});
	});

	async function rename(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (!mod || error) return;
		const target = mod;
		mod = null;
		if (title.trim() !== target.displayTitle)
			await libraryStore.setCustomTitle(target, title);
	}

	async function reset(): Promise<void> {
		const target = mod!;
		mod = null;
		await libraryStore.setCustomTitle(target, null);
	}
</script>

<Dialog.Root
	open={mod !== null}
	onOpenChange={(isOpen) => !isOpen && (mod = null)}
>
	<Dialog.Content class="sm:max-w-[460px]">
		<Dialog.Header>
			<Dialog.Title>{t('modDetails.rename.title')}</Dialog.Title>
		</Dialog.Header>
		<form id="rename-mod" class="flex flex-col gap-5" onsubmit={rename}>
			<Field.Field>
				<Field.Label for="rename-mod-title">
					{t('modDetails.rename.label')}
				</Field.Label>
				<Input
					id="rename-mod-title"
					bind:value={title}
					aria-invalid={isTouched && error !== null}
					oninput={() => (isTouched = true)}
					onfocus={(event) => event.currentTarget.select()}
				/>
				{#if isTouched && error}
					<Field.Error>{t(error)}</Field.Error>
				{:else if mod?.custom_title}
					<Field.Description>
						{t('modDetails.titleEdit.original', {
							title: mod.title,
						})}
					</Field.Description>
				{/if}
			</Field.Field>
		</form>
		<Dialog.Footer class="sm:justify-between">
			<span>
				{#if mod?.custom_title}
					<Button variant="ghost" onclick={reset}>
						{t('modDetails.rename.reset')}
					</Button>
				{/if}
			</span>
			<span class="flex gap-2">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="ghost"
							>{t('common.cancel')}</Button
						>
					{/snippet}
				</Dialog.Close>
				<Button type="submit" form="rename-mod">
					{t('modDetails.rename.save')}
				</Button>
			</span>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
