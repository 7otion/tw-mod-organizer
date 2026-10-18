import { Store } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type DownloadProgress = { received: number; total: number };

export class S7forgeStore extends Store {
	version = $state<string | null>(null);
	isChecked = $state(false);
	isInstalling = $state(false);
	downloadProgress = $state.raw<DownloadProgress | null>(null);

	constructor() {
		super();
		void this.check();
	}

	async install(): Promise<void> {
		this.isInstalling = true;
		const unlisten = await listen<DownloadProgress>(
			's7forge-download-progress',
			(event) => (this.downloadProgress = event.payload)
		);
		try {
			this.version = await invoke<string>('install_s7forge');
		} finally {
			unlisten();
			this.isInstalling = false;
			this.downloadProgress = null;
		}
	}

	private async check(): Promise<void> {
		try {
			this.version = await invoke<string | null>('s7forge_version');
		} finally {
			this.isChecked = true;
		}
	}
}
