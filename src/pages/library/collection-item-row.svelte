<script lang="ts">
	import { Checkbox } from '@/components/ui/checkbox';

	import { formatSize, t } from '@/lib/i18n';
	import { cn } from '@/lib/utils';

	import type { CollectionRow } from './collection-import.svelte';

	type Props = {
		row: CollectionRow;
		ontoggle: () => void;
	};

	let { row, ontoggle }: Props = $props();

	const STATUS_CLASSES: Record<CollectionRow['status'], string> = {
		new: 'text-status-update',
		skipped: 'text-muted-foreground',
		inLibrary: 'text-status-ok',
		collection: 'text-muted-foreground',
		otherGame: 'text-muted-foreground',
	};

	const isLocked = $derived(row.status !== 'new' && row.status !== 'skipped');
</script>

<li
	class={cn(
		'grid h-9 grid-cols-(--collection-columns) items-center gap-x-3 px-2 text-sm',
		row.status === 'skipped' && 'opacity-60'
	)}
>
	<Checkbox
		checked={row.status === 'new'}
		disabled={isLocked}
		aria-label={t('library.importCollection.include')}
		onCheckedChange={ontoggle}
	/>
	<span class="flex size-7 overflow-hidden rounded-md bg-fill-1">
		{#if row.item.preview_url}
			<img
				src={row.item.preview_url}
				alt=""
				loading="lazy"
				class="size-full object-cover object-top"
			/>
		{/if}
	</span>
	<span class="truncate font-medium">{row.item.title}</span>
	<span class="text-right text-muted-foreground tabular-nums">
		{formatSize(row.item.size_bytes)}
	</span>
	<span class={cn('text-right font-semibold', STATUS_CLASSES[row.status])}>
		{t(`library.importCollection.statuses.${row.status}`)}
	</span>
</li>
