<script lang="ts">
	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';

	import { t } from '@/lib/i18n';
	import { AppStore } from '@/lib/store';

	import LicencesDialog from './licences-dialog.svelte';
	import SettingRow from './setting-row.svelte';

	const AVAILABLE_VERSION = '2.1.0';

	const appStore = AppStore.get();

	let isShowingLicences = $state(false);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{t('settings.sections.about')}</Card.Title>
	</Card.Header>
	<Card.Content class="gap-0 p-0">
		<SettingRow
			title={t('settings.about.version', { version: appStore.version })}
			description={t('settings.about.available', {
				version: AVAILABLE_VERSION,
			})}
		>
			<div class="flex gap-1.5">
				<Button variant="secondary" size="sm">
					{t('settings.about.whatsNew')}
				</Button>
				<Button size="sm">{t('settings.about.updateRestart')}</Button>
			</div>
		</SettingRow>
		<SettingRow
			title={t('settings.about.notAffiliated.title')}
			description={t('settings.about.notAffiliated.description')}
		>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (isShowingLicences = true)}
			>
				{t('settings.about.licences')}
			</Button>
		</SettingRow>
	</Card.Content>
</Card.Root>

<LicencesDialog bind:open={isShowingLicences} />
