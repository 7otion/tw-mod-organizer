<script lang="ts">
	import SettingsIcon from '@lucide/svelte/icons/settings';

	import { t } from '@/lib/i18n';
	import RailAction from '@/shell/rail/rail-action.svelte';

	import SettingsDialog from './settings-dialog.svelte';

	let isOpen = $state(false);
</script>

<RailAction
	icon={SettingsIcon}
	label={t('settings.title')}
	active={isOpen}
	onclick={() => (isOpen = true)}
/>

<SettingsDialog bind:open={isOpen} />
