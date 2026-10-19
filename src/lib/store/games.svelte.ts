import { ConnectionStore } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';

import { Game, Profile } from '@/lib/models';
import { SettingsStore } from '@/lib/store';
import { unixNow } from '@/lib/utils';

export type SupportedGame = {
	app_id: number;
	series: string;
	title: string;
	cover: string;
	detected_path: string | null;
};

export type GameEntry = SupportedGame & {
	row: Game | null;
	installPath: string | null;
	isInstalled: boolean;
	isPinned: boolean;
};

export class GamesStore extends ConnectionStore {
	readonly #settingsStore = SettingsStore.get();
	readonly #rows = this.query(() => Game.query());

	supported = $state.raw<readonly SupportedGame[]>([]);
	isDetected = $state(false);
	isBrowsing = $state(false);

	readonly list = $derived<GameEntry[]>(
		this.supported.map((game) => {
			const row =
				this.#rows.collection.find(
					(row) => row.app_id === game.app_id
				) ?? null;
			const installPath = row?.install_path ?? game.detected_path;
			return {
				...game,
				row,
				installPath,
				isInstalled: installPath !== null,
				isPinned: row?.pin_position != null,
			};
		})
	);

	readonly current = $derived(
		this.list.find(
			(game) =>
				game.app_id === this.#settingsStore.current?.current_game_id
		) ?? null
	);

	readonly pinned = $derived(
		this.list
			.filter((game) => game.isPinned)
			.sort((a, b) => a.row!.pin_position! - b.row!.pin_position!)
	);

	readonly recent = $derived(
		this.list
			.filter((game) => game.row?.last_opened_at)
			.sort(
				(a, b) =>
					b.row!.last_opened_at!.getTime() -
					a.row!.last_opened_at!.getTime()
			)
	);

	readonly isReady = $derived(
		this.isDetected && this.#rows.loaded && this.#settingsStore.isLoaded
	);

	constructor() {
		super();
		void this.detect();
	}

	async open(game: GameEntry): Promise<void> {
		const row = await Game.updateOrCreate(
			{ app_id: game.app_id },
			{ last_opened_at: unixNow() }
		);
		if (row.active_profile_id === null) {
			const profile = await Profile.firstOrCreate(
				{ game_id: game.app_id },
				{ name: 'Default', position: 1 }
			);
			await row.update({ active_profile_id: profile.id });
		}
		await this.#settingsStore.current!.update({
			current_game_id: game.app_id,
		});
		this.isBrowsing = false;
	}

	async close(): Promise<void> {
		await this.#settingsStore.current!.update({ current_game_id: null });
	}

	async togglePin(game: GameEntry): Promise<void> {
		if (game.isPinned) {
			await game.row!.update({ pin_position: null });
			return;
		}
		const last = this.pinned.at(-1)?.row!.pin_position ?? 0;
		await Game.updateOrCreate(
			{ app_id: game.app_id },
			{ pin_position: last + 1 }
		);
	}

	async setFolder(game: GameEntry, path: string): Promise<void> {
		await invoke('check_game_folder', { app_id: game.app_id, path });
		await Game.updateOrCreate(
			{ app_id: game.app_id },
			{ install_path: path }
		);
	}

	private async detect(): Promise<void> {
		try {
			this.supported = await invoke<SupportedGame[]>('list_games');
		} finally {
			this.isDetected = true;
		}
	}
}
