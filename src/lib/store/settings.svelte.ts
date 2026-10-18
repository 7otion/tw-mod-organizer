import { ConnectionStore } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { Settings } from '@/lib/models';

export type FolderColumn = 'mods_dir' | 'downloads_dir';
export type FolderMove = {
	column: FolderColumn;
	copied: number;
	total: number;
};

export class SettingsStore extends ConnectionStore {
	readonly #row = this.query(() => Settings.query().whereKey(1));

	readonly current = $derived(this.#row.first);
	readonly isLoaded = $derived(this.#row.loaded);
	folderMove = $state.raw<FolderMove | null>(null);

	async moveFolder(column: FolderColumn, to: string): Promise<string | null> {
		const settings = this.current;
		if (!settings || this.folderMove || settings[column] === to)
			return null;

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
}
