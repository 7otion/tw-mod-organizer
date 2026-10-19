import { ConnectionStore } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { type DateFormat, Settings } from '@/lib/models';

export type FolderColumn = 'mods_dir' | 'downloads_dir';
export type FolderMove = {
	column: FolderColumn;
	copied: number;
	total: number;
};
export type SteamStatus = {
	is_installed: boolean;
	is_running: boolean;
};

const FALLBACK_DATE_PATTERN = 'yyyy-MM-dd';

export class SettingsStore extends ConnectionStore {
	readonly #row = this.query(() => Settings.query().whereKey(1));

	#systemDatePattern = $state.raw<string | null>(null);

	readonly current = $derived(this.#row.first);
	readonly isLoaded = $derived(this.#row.loaded);
	folderMove = $state.raw<FolderMove | null>(null);
	steamStatus = $state.raw<SteamStatus | null>(null);

	readonly datePattern = $derived.by(() => {
		const format = this.current?.date_format ?? 'system';
		return format === 'system' ? this.systemDatePattern : format;
	});

	constructor() {
		super();
		void this.loadSystemDatePattern();
	}

	get systemDatePattern(): string {
		return this.#systemDatePattern ?? FALLBACK_DATE_PATTERN;
	}

	async setDateFormat(format: DateFormat): Promise<void> {
		await this.current!.update({ date_format: format });
	}

	async moveFolder(column: FolderColumn, to: string): Promise<string | null> {
		const settings = this.current!;
		if (this.folderMove || settings[column] === to) return null;

		this.folderMove = { column, copied: 0, total: 0 };
		const unlisten = await listen<Omit<FolderMove, 'column'>>(
			'folder-move-progress',
			(event) => (this.folderMove = { column, ...event.payload })
		);
		try {
			const leftover = await invoke<string | null>('move_folder', {
				column,
				to,
			});
			await settings.refresh();
			return leftover;
		} finally {
			unlisten();
			this.folderMove = null;
		}
	}

	async refreshSteamStatus(): Promise<void> {
		this.steamStatus = await invoke<SteamStatus>('steam_status');
	}

	private async loadSystemDatePattern(): Promise<void> {
		this.#systemDatePattern = await invoke<string | null>(
			'system_date_pattern'
		);
	}
}
