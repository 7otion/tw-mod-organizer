<script lang="ts">
	import Columns3Icon from '@lucide/svelte/icons/columns-3';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';
	import { Switch } from '@/components/ui/switch';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import SettingRow from './setting-row.svelte';

	let rowSize = $state('regular');
	let coverPreview = $state(true);
</script>

<Card.Root>
	<Card.Header><Card.Title>Table &amp; display</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="Table columns"
			description="Visible columns, their order and widths"
		>
			<Button variant="secondary" size="sm">
				<Columns3Icon />
				Table…
			</Button>
		</SettingRow>
		<SettingRow title="Row size" description="Compact hides covers">
			<ToggleGroup.Root type="single" bind:value={rowSize}>
				<ToggleGroup.Item value="compact">Compact</ToggleGroup.Item>
				<ToggleGroup.Item value="regular">Regular</ToggleGroup.Item>
				<ToggleGroup.Item value="large">Large</ToggleGroup.Item>
			</ToggleGroup.Root>
		</SettingRow>
		<SettingRow
			title="Cover preview on hover"
			description="Larger preview after a short delay"
		>
			<Switch
				bind:checked={coverPreview}
				aria-label="Cover preview on hover"
			/>
		</SettingRow>
	</Card.Content>
</Card.Root>
