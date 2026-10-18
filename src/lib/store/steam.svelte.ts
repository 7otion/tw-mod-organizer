import { Store } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';

export type SteamStatus = { is_installed: boolean; is_running: boolean };

export class SteamStore extends Store {
	status = $state.raw<SteamStatus | null>(null);

	async refresh(): Promise<void> {
		this.status = await invoke<SteamStatus>('steam_status');
	}
}
