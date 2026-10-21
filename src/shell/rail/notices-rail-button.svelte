<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';

	import { t } from '@/lib/i18n';
	import { NoticesStore } from '@/lib/store';

	import RailAction from './rail-action.svelte';

	const MAX_BADGE = 99;

	const noticesStore = NoticesStore.get();

	const badge = $derived.by(() => {
		const count = noticesStore.badgeCount;
		if (!count) return null;
		return count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
	});
	const label = $derived(
		noticesStore.badgeCount
			? t('notices.bell.needAction', { count: noticesStore.badgeCount })
			: t('notices.title')
	);
</script>

<RailAction
	icon={BellIcon}
	{label}
	{badge}
	hasDot={noticesStore.hasDot}
	active={noticesStore.isOpen}
	onclick={() => noticesStore.toggle()}
/>
