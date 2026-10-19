<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';

	import { t } from '@/lib/i18n';
	import type { MessageKey } from '@/lib/i18n/message-key';

	import SettingRow from './setting-row.svelte';

	const SOURCES: { titleKey: MessageKey; descriptionKey: MessageKey }[] = [
		{
			titleKey: 'settings.import.tmoV1.title',
			descriptionKey: 'settings.import.tmoV1.description',
		},
		{
			titleKey: 'settings.import.wh3ModManager.title',
			descriptionKey: 'settings.import.wh3ModManager.description',
		},
	];
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{t('settings.sections.import')}</Card.Title>
	</Card.Header>
	<Card.Content class="gap-0 p-0">
		{#each SOURCES as source (source.titleKey)}
			<SettingRow
				title={t(source.titleKey)}
				description={t(source.descriptionKey)}
			>
				<Button variant="secondary" size="sm">
					<UploadIcon />
					{t('settings.import.import')}
				</Button>
			</SettingRow>
		{/each}
	</Card.Content>
</Card.Root>
