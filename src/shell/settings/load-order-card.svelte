<script lang="ts">
	import * as Card from '@/components/ui/card';
	import { Switch } from '@/components/ui/switch';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { type NewModsPlacement, NEW_MODS_PLACEMENTS } from '@/lib/models';
	import { t } from '@/lib/i18n';
	import { SettingsStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const settingsStore = SettingsStore.get();

	const settings = $derived(settingsStore.current);

	function isPlacement(value: string): value is NewModsPlacement {
		return (NEW_MODS_PLACEMENTS as readonly string[]).includes(value);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{t('settings.sections.loadOrder')}</Card.Title>
	</Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title={t('settings.loadOrder.confirmDependencies.title')}
			description={t(
				'settings.loadOrder.confirmDependencies.description'
			)}
		>
			<Switch
				checked={settings?.confirm_dependency_changes ?? true}
				onCheckedChange={(checked) =>
					settings?.update({ confirm_dependency_changes: checked })}
				aria-label={t('settings.loadOrder.confirmDependencies.title')}
			/>
		</SettingRow>
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
		<SettingRow
			title={t('settings.loadOrder.newMods.title')}
			description={t('settings.loadOrder.newMods.description')}
		>
			<ToggleGroup.Root
				type="single"
				value={settings?.new_mods_placement ?? 'end_of_list'}
				onValueChange={(value) =>
					isPlacement(value) &&
					settings?.update({ new_mods_placement: value })}
			>
				<ToggleGroup.Item value="end_of_list">
					{t('settings.loadOrder.newMods.endOfList')}
				</ToggleGroup.Item>
				<ToggleGroup.Item value="selected_section">
					{t('settings.loadOrder.newMods.selectedSection')}
				</ToggleGroup.Item>
			</ToggleGroup.Root>
		</SettingRow>
	</Card.Content>
</Card.Root>
