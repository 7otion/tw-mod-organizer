<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';

	import RemoveModsDialog from '@/components/remove-mods-dialog.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore } from '@/lib/store';

	type Props = {
		mod: Mod;
		onrename: () => void;
	};

	const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

	let { mod, onrename }: Props = $props();

	const libraryStore = LibraryStore.get();

	let isRemoving = $state(false);

	async function setCover(): Promise<void> {
		const source = await open({
			filters: [
				{
					name: t('modDetails.menu.imageFilter'),
					extensions: IMAGE_EXTENSIONS,
				},
			],
		});
		if (source) await libraryStore.setCover(mod, source);
	}

	async function copySteamId(): Promise<void> {
		await navigator.clipboard.writeText(mod.source_ref);
		toast.success(t('modDetails.menu.steamIdCopied'));
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="icon-sm"
				class="size-7.5"
				aria-label={t('modDetails.menu.label')}
			>
				<EllipsisIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-52">
		<DropdownMenu.Item onSelect={onrename}>
			{t('modDetails.menu.rename')}
		</DropdownMenu.Item>
		<DropdownMenu.Item onSelect={setCover}>
			{t('modDetails.menu.setCover')}
		</DropdownMenu.Item>
		{#if mod.source === 'steam'}
			<DropdownMenu.Item onSelect={copySteamId}>
				{t('modDetails.menu.copySteamId')}
			</DropdownMenu.Item>
		{/if}
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			{t('modDetails.menu.removeFromProfile')}
		</DropdownMenu.Item>
		<DropdownMenu.Item
			variant="destructive"
			disabled={mod.isMissing && mod.source === 'steam'}
			onSelect={() => (isRemoving = true)}
		>
			{mod.source === 'steam'
				? t('modDetails.menu.unsubscribe')
				: t('modDetails.menu.remove')}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<RemoveModsDialog bind:open={isRemoving} mods={[mod]} onremoved={() => {}} />
