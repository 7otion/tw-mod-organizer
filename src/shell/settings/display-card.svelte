<script lang="ts">
	import Columns3Icon from '@lucide/svelte/icons/columns-3';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import { open, save } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';

	import { Button } from '@/components/ui/button';
	import * as Card from '@/components/ui/card';
	import * as Select from '@/components/ui/select';
	import { Switch } from '@/components/ui/switch';
	import * as ToggleGroup from '@/components/ui/toggle-group';

	import { formatDate, t } from '@/lib/i18n';
	import { COVER_SIZES } from '@/lib/mod-table/mod-columns';
	import { DATE_FORMATS, type DateFormat } from '@/lib/models';
	import {
		LanguageStore,
		type LanguageOption,
		SettingsStore,
		SYSTEM_LANGUAGE,
	} from '@/lib/store';

	import SettingRow from './setting-row.svelte';

	const languageStore = LanguageStore.get();
	const settingsStore = SettingsStore.get();

	const TEMPLATE_NAME = 'tmo-language-en.toml';

	const today = new Date();

	let languages = $state.raw<LanguageOption[]>([]);

	const systemLabel = $derived(
		t('settings.display.language.system', {
			name: languageStore.current.name,
		})
	);

	let coverSize = $state('compact');
	let coverPreview = $state(true);

	function example(format: DateFormat): string {
		const pattern =
			format === 'system' ? settingsStore.systemDatePattern : format;
		const date = formatDate(today, pattern);
		return format === 'system'
			? t('settings.display.dateFormat.system', { date })
			: date;
	}

	function languageLabel(option: LanguageOption): string {
		if (option.coverage >= 1) return option.pack.language.name;
		const percent = Math.floor(option.coverage * 100);
		return `${option.pack.language.name} · ${t('settings.display.language.translated', { percent })}`;
	}

	async function refreshLanguages(): Promise<void> {
		languages = await languageStore.options();
	}

	async function addLanguage(): Promise<void> {
		const path = await open({
			filters: [
				{
					name: t('settings.display.language.fileFilter'),
					extensions: ['toml'],
				},
			],
		});
		if (!path) return;
		const pack = await languageStore.addFile(path);
		await refreshLanguages();
		await languageStore.choose(pack.language.id);
		toast.success(
			t('settings.display.language.added', { name: pack.language.name })
		);
	}

	async function exportTemplate(): Promise<void> {
		const destination = await save({
			defaultPath: TEMPLATE_NAME,
			filters: [
				{
					name: t('settings.display.language.fileFilter'),
					extensions: ['toml'],
				},
			],
		});
		if (!destination) return;
		await languageStore.exportTemplate(destination);
		toast.success(t('settings.display.language.exported'));
	}

	$effect(() => {
		void refreshLanguages();
	});
</script>

<div class="flex flex-col gap-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>{t('settings.sections.display')}</Card.Title>
		</Card.Header>
		<Card.Content class="gap-0 p-0">
			<SettingRow
				icon={LanguagesIcon}
				title={t('settings.display.language.title')}
				description={t('settings.display.language.description')}
			>
				<div class="flex items-center gap-2">
					<Select.Root
						type="single"
						bind:value={
							() => languageStore.choice,
							(id) => void languageStore.choose(id)
						}
					>
						<Select.Trigger
							size="sm"
							aria-label={t('settings.display.language.title')}
							class="min-w-48"
						>
							{languageStore.choice === SYSTEM_LANGUAGE
								? systemLabel
								: languageStore.current.name}
						</Select.Trigger>
						<Select.Content align="end">
							<Select.Item
								value={SYSTEM_LANGUAGE}
								label={systemLabel}
							>
								{systemLabel}
							</Select.Item>
							{#each languages as option (option.pack.language.id)}
								<Select.Item
									value={option.pack.language.id}
									label={option.pack.language.name}
								>
									{languageLabel(option)}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Button variant="secondary" size="sm" onclick={addLanguage}>
						{t('settings.display.language.addFile')}
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={exportTemplate}
					>
						{t('settings.display.language.exportTemplate')}
					</Button>
				</div>
			</SettingRow>
			<SettingRow
				title={t('settings.display.dateFormat.title')}
				description={t('settings.display.dateFormat.description')}
			>
				<Select.Root
					type="single"
					bind:value={
						() => settingsStore.current?.date_format ?? 'system',
						(format) =>
							void settingsStore.setDateFormat(
								format as DateFormat
							)
					}
				>
					<Select.Trigger
						size="sm"
						aria-label={t('settings.display.dateFormat.title')}
						class="min-w-48"
					>
						{example(
							settingsStore.current?.date_format ?? 'system'
						)}
					</Select.Trigger>
					<Select.Content align="end">
						{#each DATE_FORMATS as format (format)}
							<Select.Item value={format} label={example(format)}>
								{example(format)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</SettingRow>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t('settings.display.table.title')}</Card.Title>
		</Card.Header>
		<Card.Content class="gap-0 p-0">
			<SettingRow
				title={t('settings.display.table.columns.title')}
				description={t('settings.display.table.columns.description')}
			>
				<Button variant="secondary" size="sm">
					<Columns3Icon />
					{t('modTable.settingsButton')}
				</Button>
			</SettingRow>
			<SettingRow
				title={t('settings.display.table.coverSize.title')}
				description={t('settings.display.table.coverSize.description')}
			>
				<ToggleGroup.Root type="single" bind:value={coverSize}>
					{#each COVER_SIZES as size (size)}
						<ToggleGroup.Item value={size}>
							{t(`coverSizes.${size}`)}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</SettingRow>
			<SettingRow
				title={t('settings.display.table.coverPreview.title')}
				description={t(
					'settings.display.table.coverPreview.description'
				)}
			>
				<Switch
					bind:checked={coverPreview}
					aria-label={t('settings.display.table.coverPreview.title')}
				/>
			</SettingRow>
		</Card.Content>
	</Card.Root>
</div>
