<script lang="ts">
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';

	import { S7forgeStore } from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const s7forgeStore = S7forgeStore.get();
</script>

<Card.Root>
	<Card.Header><Card.Title>Accounts &amp; tools</Card.Title></Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title="Steam"
			titleClass="text-blue-400"
			description="Used for subscriptions, updates and launching"
		>
			<span
				class="inline-flex items-center gap-1.5 text-xs font-semibold text-status-ok"
			>
				<CircleCheckIcon class="size-3.5" />
				Detected · running
			</span>
		</SettingRow>
		<SettingRow
			title="Nexus Mods"
			titleClass="text-orange-400"
			description="ar3_modder · free account"
		>
			<Button variant="ghost" size="sm">
				<LogOutIcon />
				Disconnect…
			</Button>
		</SettingRow>
		<SettingRow
			title="s7forge"
			description="Talks to Steam for workshop features, without keeping your game marked as running"
		>
			<span class="font-mono text-sm text-foreground-2">
				v{s7forgeStore.version}
			</span>
		</SettingRow>
	</Card.Content>
</Card.Root>
