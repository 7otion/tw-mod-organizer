<script lang="ts">
	import * as Card from '@/components/ui/card';
	import { Switch } from '@/components/ui/switch';

	import { t } from '@/lib/i18n';
	import { SettingsStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const settingsStore = SettingsStore.get();

	const settings = $derived(settingsStore.current);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{t('settings.sections.loadOrder')}</Card.Title>
	</Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title={t('settings.loadOrder.previewSort.title')}
			description={t('settings.loadOrder.previewSort.description')}
		>
			<Switch
				checked={settings?.preview_auto_sort ?? true}
				onCheckedChange={(checked) =>
					settings?.update({ preview_auto_sort: checked })}
				aria-label={t('settings.loadOrder.previewSort.title')}
			/>
		</SettingRow>
	</Card.Content>
</Card.Root>
