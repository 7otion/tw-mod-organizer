<script lang="ts">
	import ArrowDownUpIcon from '@lucide/svelte/icons/arrow-down-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import TagIcon from '@lucide/svelte/icons/tag';
	import XIcon from '@lucide/svelte/icons/x';

	import NewTagDialog from '@/components/new-tag-dialog.svelte';
	import TagChecklistItems from '@/components/tag-checklist-items.svelte';
	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import LoadOrderMoveItems from './load-order-move-items.svelte';

	import { t } from '@/lib/i18n';
	import type { ModTable } from '@/lib/mod-table/mod-table-state.svelte';
	import {
		LoadOrderStore,
		type LoadOrderRow,
		type ModRow,
	} from '@/lib/store';

	type Props = {
		table: ModTable<LoadOrderRow, number>;
		onpriority: (rows: readonly LoadOrderRow[]) => void;
	};

	let { table, onpriority }: Props = $props();

	const loadOrderStore = LoadOrderStore.get();

	let isCreatingTag = $state(false);

	const rows = $derived(
		table.selectedRows().filter((row): row is ModRow => row.kind === 'mod')
	);
	const mods = $derived(rows.map((row) => row.mod));
	const canRemove = $derived(rows.some((row) => !row.member));
	const isAllOn = $derived(
		rows.length > 0 && rows.every((row) => row.isEnabled)
	);
</script>

<Button
	variant="ghost"
	size="sm"
	class="text-foreground"
	onclick={() => loadOrderStore.setEnabled(rows, !isAllOn)}
>
	{#if isAllOn}
		<CircleIcon />
		{t('common.disable')}
	{:else}
		<CircleCheckIcon />
		{t('common.enable')}
	{/if}
</Button>
<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class="text-foreground"
			>
				<ArrowDownUpIcon />
				{t('loadOrder.move.menu')}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" class="min-w-52">
		<LoadOrderMoveItems
			{rows}
			menu="dropdown"
			onpriority={() => onpriority(rows)}
		/>
	</DropdownMenu.Content>
</DropdownMenu.Root>
<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class="text-foreground"
			>
				<TagIcon />
				{t('common.tag')}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" class="min-w-48">
		<TagChecklistItems
			{mods}
			menu="dropdown"
			onnewtag={() => (isCreatingTag = true)}
		/>
	</DropdownMenu.Content>
</DropdownMenu.Root>
<span class="mx-1 h-4.5 w-px bg-white/8"></span>
<Button
	variant="destructive-outline"
	size="sm"
	disabled={!canRemove}
	onclick={() => loadOrderStore.remove(rows)}
>
	<XIcon />
	{t('common.removeFromProfile')}
</Button>

<NewTagDialog bind:open={isCreatingTag} {mods} />
