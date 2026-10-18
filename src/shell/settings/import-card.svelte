<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';

	import SettingRow from './setting-row.svelte';

	const SOURCES = [
		{
			title: 'Import from TMO v1',
			description: 'Profiles, separators, tags and custom titles',
		},
		{
			title: 'Import from WH3 Mod Manager',
			description: 'Presets become profiles',
		},
	];
</script>

<Card.Root>
	<Card.Header><Card.Title>Import data</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		{#each SOURCES as source (source.title)}
			<SettingRow title={source.title} description={source.description}>
				<Button variant="secondary" size="sm">
					<UploadIcon />
					Import…
				</Button>
			</SettingRow>
		{/each}
	</Card.Content>
</Card.Root>
