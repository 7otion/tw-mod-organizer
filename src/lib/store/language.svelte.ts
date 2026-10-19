import { ConnectionStore } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { untrack } from 'svelte';

import { DateFormatter } from '@/lib/i18n/dates';
import englishFile from '@/lib/i18n/languages/en.toml';
import type { MessageKey } from '@/lib/i18n/message-key';
import {
	coverage,
	type LanguagePack,
	type MessagePart,
	type MessageValues,
	readLanguagePack,
	Translator,
} from '@/lib/i18n/messages';
import { SettingsStore } from '@/lib/store';
import { toastError } from '@/lib/utils';

export type LanguageOption = {
	pack: LanguagePack;
	coverage: number;
	isBuiltIn: boolean;
};

const SIZE_KEYS: readonly MessageKey[] = [
	'size.bytes',
	'size.kilobytes',
	'size.megabytes',
	'size.gigabytes',
	'size.terabytes',
];

export const SYSTEM_LANGUAGE = 'system';

const ENGLISH = readLanguagePack(englishFile);
const ENGLISH_TRANSLATOR = new Translator(ENGLISH, ENGLISH);
const BUILT_IN = import.meta.glob(
	['/src/lib/i18n/languages/*.toml', '!/src/lib/i18n/languages/en.toml'],
	{ import: 'default' }
);

export class LanguageStore extends ConnectionStore {
	readonly #settingsStore = SettingsStore.get();

	#pack = $state.raw<LanguagePack>(ENGLISH);
	#loadingId: string | null = null;

	readonly #translator = $derived(new Translator(this.#pack, ENGLISH));
	readonly #dates = $derived(new DateFormatter(this.#pack.language.locale));
	readonly current = $derived(this.#pack.language);
	readonly choice = $derived(
		this.#settingsStore.current?.language ?? SYSTEM_LANGUAGE
	);

	constructor() {
		super();
		$effect(() => {
			const id = this.choice;
			untrack(() => void this.load(id));
		});
		$effect(() => {
			document.documentElement.lang = this.#pack.language.locale;
		});
	}

	readonly t = (key: MessageKey, values?: MessageValues): string =>
		this.#translator.translate(key, values);

	parts(key: MessageKey, values?: MessageValues): MessagePart[] {
		return this.#translator.parts(key, values);
	}

	formatSize(bytes: number): string {
		let size = bytes;
		let unit = 0;
		while (size >= 1024 && unit < SIZE_KEYS.length - 1) {
			size /= 1024;
			unit++;
		}
		const precision = unit > 0 && size < 10 ? 10 : 1;
		return this.t(SIZE_KEYS[unit], {
			size: Math.round(size * precision) / precision,
		});
	}

	formatDate(date: Date, pattern = this.#settingsStore.datePattern): string {
		return this.#dates.format(date, pattern);
	}

	timeAgo(date: Date): string {
		return this.#dates.timeAgo(date);
	}

	async options(): Promise<LanguageOption[]> {
		return (await LanguageStore.packs()).map((option) => ({
			...option,
			coverage: coverage(option.pack, ENGLISH),
		}));
	}

	async choose(id: string): Promise<void> {
		await this.#settingsStore.current!.update({ language: id });
	}

	async addFile(path: string): Promise<LanguagePack> {
		const pack = readLanguagePack(
			await invoke('read_language_file', { path })
		);
		if (LanguageStore.isBuiltIn(pack.language.id))
			throw new Error(
				this.t('settings.display.language.builtIn', {
					id: pack.language.id,
				})
			);
		await invoke('install_language_pack', { path });
		return pack;
	}

	async exportTemplate(destination: string): Promise<void> {
		await invoke('export_language_template', { destination });
	}

	private async load(id: string): Promise<void> {
		this.#loadingId = id;
		try {
			const pack = await LanguageStore.find(id);
			if (this.#loadingId === id) this.#pack = pack;
		} catch (error) {
			if (this.#loadingId === id) this.#pack = ENGLISH;
			toastError(error);
		}
	}

	private static async find(id: string): Promise<LanguagePack> {
		if (id === SYSTEM_LANGUAGE) return LanguageStore.systemPack();
		if (id === ENGLISH.language.id) return ENGLISH;
		const builtIn = BUILT_IN[LanguageStore.builtInPath(id)];
		if (builtIn) return readLanguagePack(await builtIn());
		const pack = (await LanguageStore.installed()).find(
			(installed) => installed.language.id === id
		);
		if (!pack)
			throw new Error(
				ENGLISH_TRANSLATOR.translate(
					'settings.display.language.missing',
					{
						id,
					}
				)
			);
		return pack;
	}

	private static async systemPack(): Promise<LanguagePack> {
		const preferred = navigator.languages;
		const english = LanguageStore.baseOf(ENGLISH.language.locale);
		if (!preferred.length || LanguageStore.baseOf(preferred[0]) === english)
			return ENGLISH;
		const packs = (await LanguageStore.packs()).map(({ pack }) => pack);
		for (const tag of preferred) {
			const match =
				packs.find(
					(pack) =>
						pack.language.locale.toLowerCase() === tag.toLowerCase()
				) ??
				packs.find(
					(pack) =>
						LanguageStore.baseOf(pack.language.locale) ===
						LanguageStore.baseOf(tag)
				);
			if (match) return match;
		}
		return ENGLISH;
	}

	private static async packs(): Promise<Omit<LanguageOption, 'coverage'>[]> {
		const builtIn = await Promise.all(
			Object.values(BUILT_IN).map(async (load) =>
				readLanguagePack(await load())
			)
		);
		const installed = (await LanguageStore.installed()).filter(
			(pack) => !LanguageStore.isBuiltIn(pack.language.id)
		);
		return [
			...[ENGLISH, ...builtIn].map((pack) => ({ pack, isBuiltIn: true })),
			...installed.map((pack) => ({ pack, isBuiltIn: false })),
		];
	}

	private static baseOf(locale: string): string {
		return locale.split('-')[0].toLowerCase();
	}

	private static async installed(): Promise<LanguagePack[]> {
		const files = await invoke<unknown[]>('list_language_packs');
		return files.flatMap((file) => {
			try {
				return [readLanguagePack(file)];
			} catch (error) {
				console.warn(error);
				return [];
			}
		});
	}

	private static isBuiltIn(id: string): boolean {
		return (
			id === ENGLISH.language.id ||
			LanguageStore.builtInPath(id) in BUILT_IN
		);
	}

	private static builtInPath(id: string): string {
		return `/src/lib/i18n/languages/${id}.toml`;
	}
}
