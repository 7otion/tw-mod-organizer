<script lang="ts">
	import { untrack } from 'svelte';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import { LoadOrderStore, type LoadOrderRow } from '@/lib/store';

	let { rows = $bindable(null) }: { rows: readonly LoadOrderRow[] | null } =
		$props();

	const loadOrderStore = LoadOrderStore.get();

	let value = $state(1);

	const max = $derived(loadOrderStore.modRows.length);
	const isValid = $derived(
		Number.isInteger(value) && value >= 1 && value <= max
	);

	$effect(() => {
		const current = rows;
		untrack(() => {
			const first = current?.find((row) => row.kind === 'mod');
			value = first?.kind === 'mod' ? first.number : 1;
		});
	});

	async function move(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!rows || !isValid) return;
		const moving = rows;
		rows = null;
		await loadOrderStore.moveToPriority(moving, value);
	}
</script>

<Dialog.Root
	open={rows !== null}
	onOpenChange={(isOpen) => !isOpen && (rows = null)}
>
	<Dialog.Content class="sm:max-w-[360px]">
		<Dialog.Header>
			<Dialog.Title>{t('loadOrder.move.priorityTitle')}</Dialog.Title>
			<Dialog.Description>
				{t('loadOrder.move.priorityDescription', { max })}
			</Dialog.Description>
		</Dialog.Header>
		<form id="move-to-priority" class="flex flex-col gap-5" onsubmit={move}>
			<Field.Field>
				<Field.Label for="move-to-priority-number">
					{t('loadOrder.move.priorityLabel')}
				</Field.Label>
				<Input
					id="move-to-priority-number"
					type="number"
					min={1}
					{max}
					bind:value
					class="w-28 font-mono"
				/>
			</Field.Field>
		</form>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost">
						{t('common.cancel')}
					</Button>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="move-to-priority" disabled={!isValid}>
				{t('loadOrder.move.confirm')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
