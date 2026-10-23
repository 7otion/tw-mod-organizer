import { ConnectionStore, Model } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';

import { Launch, LaunchEntry, type ModSource } from '@/lib/models';
import { unixNow } from '@/lib/utils';

import { GamesStore } from './games.svelte';
import { LoadOrderStore, type ModRow } from './load-order.svelte';
import { ProfilesStore } from './profiles.svelte';

type LaunchMod = {
	folder: string;
	game_ref: string;
};

type SnapshotRow = {
	launch_id: number;
	order_index: number;
	kind: 'mod' | 'separator' | 'group';
	enabled: boolean;
	mod_id: number | null;
	mod_source: ModSource | null;
	mod_ref: string | null;
	group_id: number | null;
	group_index: number | null;
	title: string;
	background_color: string | null;
	text_color: string | null;
};

const TICK_MS = 1000;

export class LaunchStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #profilesStore = ProfilesStore.get();
	readonly #loadOrderStore = LoadOrderStore.get();
	readonly #gameId = $derived(this.#gamesStore.current?.app_id ?? 0);
	readonly #open = this.query(() =>
		Launch.query()
			.where('game_id', this.#gameId)
			.whereNull('ended_at')
			.orderBy('started_at', 'desc')
	);

	#now = $state(unixNow());
	#checkedLaunchId: number | null = null;
	isLaunching = $state(false);

	readonly current = $derived(this.#open.rows[0] ?? null);
	readonly isRunning = $derived(this.current !== null);
	readonly elapsedSeconds = $derived.by(() => {
		const launch = this.current;
		if (!launch) return 0;
		return Math.max(
			0,
			this.#now - Math.floor(launch.started_at.getTime() / 1000)
		);
	});

	constructor() {
		super();
		$effect(() => {
			const unlisten = listen<number>('game-exited', (event) => {
				const launch = this.current;
				if (launch && launch.game_id === event.payload)
					void this.close(launch);
			});
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			if (!this.isRunning) return;
			this.#now = unixNow();
			const timer = setInterval(() => (this.#now = unixNow()), TICK_MS);
			return () => clearInterval(timer);
		});
		$effect(() => {
			const launch = this.current;
			if (!launch || !this.#open.loaded) return;
			untrack(() => void this.reconcile(launch));
		});
	}

	async play(): Promise<void> {
		const game = this.#gamesStore.current;
		const profile = this.#profilesStore.active;
		if (!game?.installPath || !profile || this.current || this.isLaunching)
			return;
		this.isLaunching = true;
		try {
			const launch = await Model.database.transaction(async (tx) => {
				const created = await Launch.create(
					{
						game_id: game.app_id,
						profile_id: profile.id,
						profile_name: profile.name,
						started_at: unixNow(),
						ended_at: null,
						loaded_save: null,
					},
					tx
				);
				await LaunchEntry.createMany(this.snapshot(created.id), tx);
				await profile.update({ last_used_at: unixNow() }, tx);
				return created;
			});
			try {
				await invoke('launch_game', {
					app_id: game.app_id,
					install_path: game.installPath,
					mods: this.launchMods(),
					save: null,
				});
			} catch (error) {
				await this.close(launch);
				throw error;
			}
		} finally {
			this.isLaunching = false;
		}
	}

	async forceQuit(): Promise<void> {
		const game = this.#gamesStore.current;
		if (!game) return;
		await invoke('force_quit_game', { app_id: game.app_id });
	}

	static formatElapsed(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const rest = seconds % 60;
		const pad = (value: number) => String(value).padStart(2, '0');
		return hours
			? `${hours}:${pad(minutes)}:${pad(rest)}`
			: `${pad(minutes)}:${pad(rest)}`;
	}

	private async reconcile(launch: Launch): Promise<void> {
		if (this.#checkedLaunchId === launch.id) return;
		this.#checkedLaunchId = launch.id;
		const running = await invoke<boolean>('watch_game', {
			app_id: launch.game_id,
		});
		if (!running) await this.close(launch);
	}

	private async close(launch: Launch): Promise<void> {
		if (launch.ended_at !== null) return;
		await launch.update({ ended_at: unixNow() });
	}

	private launchMods(): LaunchMod[] {
		return this.#loadOrderStore.modRows.flatMap((row): LaunchMod[] => {
			const mod = row.mod;
			if (
				!row.isEnabled ||
				mod.folder === null ||
				mod.game_ref === null ||
				mod.isMissing ||
				mod.problem !== null
			)
				return [];
			return [{ folder: mod.folder, game_ref: mod.game_ref }];
		});
	}

	private snapshot(launchId: number): SnapshotRow[] {
		const rows: SnapshotRow[] = [];
		const base = {
			launch_id: launchId,
			mod_id: null,
			mod_source: null,
			mod_ref: null,
			group_id: null,
			group_index: null,
			background_color: null,
			text_color: null,
		};
		const modRow = (
			row: ModRow,
			groupIndex: number | null
		): SnapshotRow => ({
			...base,
			order_index: rows.length,
			kind: 'mod',
			enabled: row.isEnabled,
			mod_id: row.mod.id,
			mod_source: row.mod.source,
			mod_ref: row.mod.source_ref,
			group_id: row.group?.id ?? null,
			group_index: groupIndex,
			title: row.mod.displayTitle,
		});
		for (const entry of this.#loadOrderStore.entries) {
			const row = this.#loadOrderStore.rowByKey(entry.id);
			if (!row) continue;
			if (row.kind === 'mod') {
				rows.push(modRow(row, null));
			} else if (row.kind === 'separator') {
				rows.push({
					...base,
					order_index: rows.length,
					kind: 'separator',
					enabled: true,
					title: row.separator.title,
					background_color: row.separator.background_color,
					text_color: row.separator.text_color,
				});
			} else {
				const groupIndex = rows.length;
				rows.push({
					...base,
					order_index: groupIndex,
					kind: 'group',
					enabled: entry.enabled,
					group_id: row.group.id,
					title: row.group.name,
					background_color: row.group.color,
				});
				for (const member of row.members)
					rows.push(modRow(member, groupIndex));
			}
		}
		return rows;
	}
}
