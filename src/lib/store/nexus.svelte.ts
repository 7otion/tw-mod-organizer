import { Store } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';

import { GamesStore } from './games.svelte';
import { LibraryStore } from './library';
import { SettingsStore } from './settings.svelte';
import { UiStateStore, type UiStateField } from './ui-state.svelte';

type NexusAccount = {
	api_key: string;
	user_name: string;
	is_premium: boolean;
};

export type NexusModDetails = {
	name: string;
	summary: string | null;
	description: string | null;
	version: string | null;
	created_timestamp: number;
	updated_timestamp: number;
	author: string | null;
	uploaded_by: string | null;
	picture_url: string | null;
	tags: string[];
};

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

export class NexusStore extends Store {
	readonly #gamesStore = GamesStore.get();
	readonly #libraryStore = LibraryStore.get();
	readonly #settingsStore = SettingsStore.get();
	readonly #uiStateStore = UiStateStore.get();

	#attempt = 0;
	isChecking = $state(false);
	isConnecting = $state(false);
	ssoUrl = $state<string | null>(null);

	readonly apiKey = $derived(
		this.#settingsStore.current?.nexus_api_key ?? null
	);
	readonly userName = $derived(
		this.#settingsStore.current?.nexus_user_name ?? null
	);
	readonly isConnected = $derived(this.apiKey !== null);

	constructor() {
		super();
		$effect(() => {
			const unlisten = listen<string>(
				'nexus-sso-url',
				(event) => (this.ssoUrl = event.payload)
			);
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			if (
				!this.isConnected ||
				!this.#gamesStore.current ||
				!this.#libraryStore.list.length ||
				!this.#uiStateStore.isLoaded
			)
				return;
			untrack(() => void this.checkUpdates());
		});
	}

	async checkUpdates(force = false): Promise<void> {
		const apiKey = this.apiKey;
		const game = this.#gamesStore.current;
		if (!apiKey || !game || this.isChecking) return;
		const now = Date.now();
		const field = NexusStore.checkedAtField(game.app_id);
		if (!force && now - this.#uiStateStore.get(field) < CHECK_EVERY_MS)
			return;
		await this.#uiStateStore.set(field, now);
		this.isChecking = true;
		try {
			const mods = this.#libraryStore.list.filter(
				(mod) =>
					mod.source === 'nexus' &&
					mod.nexus_mod_id !== null &&
					!mod.isMissing
			);
			for (const mod of mods) {
				const details = await this.modDetails(
					game.nexus_domain,
					mod.nexus_mod_id!
				);
				if (!details) continue;
				const isNewer =
					details.version !== null && details.version !== mod.version;
				await mod.update({
					remote_version: isNewer ? details.version : null,
					remote_updated_at: isNewer
						? details.updated_timestamp
						: mod.seen_updated_at,
				});
			}
		} finally {
			this.isChecking = false;
		}
	}

	private static checkedAtField(appId: number): UiStateField<number> {
		return {
			key: `nexus.checked_at.${appId}`,
			initial: 0,
			is: (value): value is number => typeof value === 'number',
		};
	}

	async modDetails(
		domain: string,
		modId: number
	): Promise<NexusModDetails | null> {
		const apiKey = this.apiKey;
		if (!apiKey) return null;
		return invoke<NexusModDetails>('nexus_mod_details', {
			api_key: apiKey,
			domain,
			mod_id: modId,
		});
	}

	async connect(): Promise<boolean> {
		const attempt = ++this.#attempt;
		this.isConnecting = true;
		this.ssoUrl = null;
		try {
			const account = await invoke<NexusAccount>('connect_nexus');
			if (attempt !== this.#attempt) return false;
			await invoke('set_nxm_handler', { enabled: true });
			await this.#settingsStore.current!.update({
				nexus_api_key: account.api_key,
				nexus_user_name: account.user_name,
			});
			return true;
		} finally {
			if (attempt === this.#attempt) {
				this.isConnecting = false;
				this.ssoUrl = null;
			}
		}
	}

	cancel(): void {
		this.#attempt++;
		this.isConnecting = false;
		this.ssoUrl = null;
	}

	async disconnect(): Promise<void> {
		await invoke('set_nxm_handler', { enabled: false });
		await this.#settingsStore.current!.update({
			nexus_api_key: null,
			nexus_user_name: null,
		});
	}
}
