<script lang="ts">
	import * as Card from '@/components/ui/card';
	import { Switch } from '@/components/ui/switch';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { type NewModsPlacement, NEW_MODS_PLACEMENTS } from '@/lib/models';
	import { SettingsStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const settingsStore = SettingsStore.get();

	const settings = $derived(settingsStore.current);

	function isPlacement(value: string): value is NewModsPlacement {
		return (NEW_MODS_PLACEMENTS as readonly string[]).includes(value);
	}
</script>

<Card.Root>
	<Card.Header><Card.Title>Load order</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="Confirm dependency changes"
			description="Ask before enabling a mod also enables what it needs, or disabling one disables what needs it"
		>
			<Switch
				checked={settings?.confirm_dependency_changes ?? true}
				onCheckedChange={(checked) =>
					settings?.update({ confirm_dependency_changes: checked })}
				aria-label="Confirm dependency changes"
			/>
		</SettingRow>
		<SettingRow
			title="Preview before Auto-sort"
			description="Show the before / after list instead of sorting straight away"
		>
			<Switch
				checked={settings?.preview_auto_sort ?? true}
				onCheckedChange={(checked) =>
					settings?.update({ preview_auto_sort: checked })}
				aria-label="Preview before Auto-sort"
			/>
		</SettingRow>
		<SettingRow
			title="New mods go to"
			description="Where mods added from the library land"
		>
			<ToggleGroup.Root
				type="single"
				value={settings?.new_mods_placement ?? 'end_of_list'}
				onValueChange={(value) =>
					isPlacement(value) &&
					settings?.update({ new_mods_placement: value })}
			>
				<ToggleGroup.Item value="end_of_list"
					>End of list</ToggleGroup.Item
				>
				<ToggleGroup.Item value="selected_section">
					Selected section
				</ToggleGroup.Item>
			</ToggleGroup.Root>
		</SettingRow>
	</Card.Content>
</Card.Root>
