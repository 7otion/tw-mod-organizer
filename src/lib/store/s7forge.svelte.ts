import { Store } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type DownloadProgress = { received: number; total: number };

function isNewer(candidate: string, current: string): boolean {
	const parts = (version: string) => version.split('.').map(Number);
	const [a, b] = [parts(candidate), parts(current)];
	for (let index = 0; index < Math.max(a.length, b.length); index++) {
		const difference = (a[index] ?? 0) - (b[index] ?? 0);
		if (difference !== 0) return difference > 0;
	}
	return false;
}

export class S7forgeStore extends Store {
	version = $state<string | null>(null);
	latestVersion = $state<string | null>(null);
	isInstalled = $state(false);
	isChecked = $state(false);
	isInstalling = $state(false);
	downloadProgress = $state.raw<DownloadProgress | null>(null);

	readonly hasUpdate = $derived(
		this.version !== null &&
			this.latestVersion !== null &&
			isNewer(this.latestVersion, this.version)
	);

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
			this.isInstalled = true;
		} finally {
			unlisten();
			this.isInstalling = false;
			this.downloadProgress = null;
		}
	}

	private async check(): Promise<void> {
		try {
			this.isInstalled = await invoke<boolean>('s7forge_installed');
		} finally {
			this.isChecked = true;
		}
		if (!this.isInstalled) return;
		this.version = await invoke<string | null>('s7forge_version');
		if (!this.version) {
			this.isInstalled = false;
			return;
		}
		await this.checkForUpdate();
	}

	private async checkForUpdate(): Promise<void> {
		try {
			this.latestVersion = await invoke<string>('latest_s7forge_version');
		} catch (error) {
			console.error(error);
		}
	}
}
