<script lang="ts">
	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';

	import { AppStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const appStore = AppStore.get();
</script>

<Card.Root>
	<Card.Header><Card.Title>Updates &amp; about</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="TMO {appStore.version}"
			description="Version 2.1.0 is available"
		>
			<div class="flex gap-1.5">
				<Button variant="secondary" size="sm">What's new…</Button>
				<Button size="sm">Update &amp; restart</Button>
			</div>
		</SettingRow>
		<SettingRow
			title="Not affiliated"
			description="TMO is not affiliated with Creative Assembly, Sega or TaleWorlds."
		>
			<Button variant="ghost" size="sm">Licences</Button>
		</SettingRow>
	</Card.Content>
</Card.Root>
