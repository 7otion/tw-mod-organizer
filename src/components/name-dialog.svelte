<script lang="ts">
	import { untrack, type Snippet } from 'svelte';

	import TagColorPicker from '@/components/tag-color-picker.svelte';
	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import type { TagColor } from '@/lib/models';
	import { nameError, type NameKind } from '@/lib/utils';

	type Props = {
		open: boolean;
		id: string;
		kind: NameKind;
		title: string;
		description?: string;
		nameLabel: string;
		submitLabel: string;
		isTaken?: (name: string) => boolean;
		hasColor?: boolean;
		initialName?: string;
		initialColor?: TagColor;
		oncreate: (name: string, color: TagColor) => Promise<void>;
		onreset?: () => void;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		id,
		kind,
		title,
		description,
		nameLabel,
		submitLabel,
		isTaken,
		hasColor = false,
		initialName = '',
		initialColor = 'ash',
		oncreate,
		onreset,
		children,
	}: Props = $props();

	let name = $state('');
	let color = $state<TagColor>('ash');
	let isTouched = $state(false);

	$effect(() => {
		if (open) untrack(reset);
	});

	const error = $derived(nameError(kind, name, isTaken?.(name) ?? false));

	function reset(): void {
		name = initialName;
		color = initialColor;
		isTouched = false;
		onreset?.();
	}

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isTouched = true;
		if (error) return;
		await oncreate(name, color);
		open = false;
		reset();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && reset()}>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>

		<form {id} class="flex flex-col gap-5" onsubmit={submit}>
			<Field.Field>
				<Field.Label for="{id}-name">{nameLabel}</Field.Label>
				<Input
					id="{id}-name"
					bind:value={name}
					aria-invalid={isTouched && error !== null}
					oninput={() => (isTouched = true)}
				/>
				{#if isTouched && error}
					<Field.Error>{t(error)}</Field.Error>
				{/if}
			</Field.Field>
			{#if hasColor}
				<Field.Field>
					<Field.Label>{t('common.colour')}</Field.Label>
					<TagColorPicker
						{color}
						onpick={(picked) => (color = picked)}
					/>
				</Field.Field>
			{/if}
			{@render children?.()}
		</form>

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost">
						{t('common.cancel')}
					</Button>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form={id}>{submitLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
