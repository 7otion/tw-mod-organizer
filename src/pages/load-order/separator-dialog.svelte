<script lang="ts">
	import NameDialog from '@/components/name-dialog.svelte';

	import { t } from '@/lib/i18n';
	import type { Separator, TagColor } from '@/lib/models';
	import { LoadOrderStore } from '@/lib/store';

	type Props = {
		open: boolean;
		separator?: Separator | null;
	};

	let { open = $bindable(false), separator = null }: Props = $props();

	const loadOrderStore = LoadOrderStore.get();
</script>

<NameDialog
	bind:open
	id={separator ? 'edit-separator' : 'new-separator'}
	kind="separator"
	title={separator
		? t('loadOrder.separator.editTitle')
		: t('loadOrder.separator.title')}
	description={t('loadOrder.separator.description')}
	nameLabel={t('loadOrder.separator.label')}
	submitLabel={separator
		? t('loadOrder.separator.save')
		: t('loadOrder.separator.create')}
	isTaken={(title) =>
		loadOrderStore.isSeparatorTitleTaken(title, separator ?? undefined)}
	hasColor
	initialName={separator?.title ?? ''}
	initialColor={(separator?.background_color as TagColor | null) ?? 'ash'}
	oncreate={(title, color) =>
		separator
			? loadOrderStore.updateSeparator(separator, title, color)
			: loadOrderStore.createSeparator(title, color)}
/>
