<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';

	import { Button } from '@/components/ui/button';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { LibraryStore } from '@/lib/store';

	type Props = {
		mod: Mod;
		isEditing: boolean;
	};

	let { mod, isEditing = $bindable(false) }: Props = $props();

	const libraryStore = LibraryStore.get();

	let draft = $state('');
	let input = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (!isEditing) return;
		draft = mod.displayTitle;
		input?.focus();
		input?.select();
	});

	async function save(): Promise<void> {
		isEditing = false;
		await libraryStore.setCustomTitle(mod, draft);
	}

	function onkeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			void save();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			isEditing = false;
		}
	}
</script>

<div class="flex items-start gap-2">
	{#if isEditing}
		<Input
			bind:ref={input}
			bind:value={draft}
			aria-label={t('modDetails.titleEdit.label')}
			class="h-9 flex-1 text-xl font-bold"
			{onkeydown}
			onblur={save}
		/>
	{:else}
		<h2 class="min-w-0 flex-1 text-xl leading-tight font-bold break-words">
			{mod.displayTitle}
		</h2>
		<Button
			variant="ghost"
			size="icon-sm"
			class="size-7.5 shrink-0"
			aria-label={t('modDetails.titleEdit.set')}
			onclick={() => (isEditing = true)}
		>
			<PencilIcon />
		</Button>
	{/if}
</div>
{#if mod.custom_title && !isEditing}
	<p class="flex items-center gap-1.5 text-xs text-foreground-2">
		<span class="truncate">
			{t('modDetails.titleEdit.original', { title: mod.title })}
		</span>
		<button
			type="button"
			class="shrink-0 cursor-pointer text-foreground-2 underline decoration-white/30 underline-offset-3 hover:decoration-white/60"
			onclick={() => libraryStore.setCustomTitle(mod, null)}
		>
			{t('modDetails.titleEdit.reset')}
		</button>
	</p>
{/if}
