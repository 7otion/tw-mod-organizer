import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';

import { Mod, ModDependency, ModTag, Tag, type ModSource } from '@/lib/models';
import { GamesStore, type GameEntry } from '@/lib/store';
import { unixNow } from '@/lib/utils';

import { WorkshopDownloadsStore } from './workshop-downloads.svelte';

type SteamDetails = {
	title: string;
	description: string;
	author_name: string;
	author_ref: string;
	page_url: string;
	preview_url: string | null;
	published_at: number;
	remote_updated_at: number;
	tags: string[];
	required: { item_ref: string; title: string | null }[];
};

type LibraryMod = {
	source: 'steam' | 'local';
	source_ref: string;
	folder: string | null;
	game_ref: string | null;
	title: string | null;
	preview_file: string | null;
	size_bytes: number | null;
	problem: string | null;
	installed_updated_at: number | null;
	added_at: number | null;
	unchanged: boolean;
	download_pending: boolean;
};

type LibraryScan = {
	steam_view: 'subscriptions' | 'workshop_folder' | 'unreachable';
	mods: LibraryMod[];
	pending_details: string[];
};

type ModDetails = {
	source_ref: string;
	steam: SteamDetails;
};

type SubscriptionTime = {
	item_id: number;
	time_subscribed: number;
};

type KnownMod = {
	source_ref: string;
	installed_updated_at: number | null;
	remote_updated_at: number | null;
	size_bytes: number | null;
};

type ScanOptions = {
	full?: boolean;
};

export type ScanProgress = {
	app_id: number;
	done: number;
	total: number;
};

export type Enrichment = {
	app_id: number;
	step: 'details' | 'times';
	done: number;
	total: number;
};

export type Thumbnail = {
	mod_id: number;
	file: string;
	width: number;
	height: number;
};

const STEAM_SYNC_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
const DETAILS_CHUNK = 100;

export class LibraryScanStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #gameId = $derived(this.#gamesStore.current?.app_id ?? 0);

	#scans = $state.raw<Readonly<Record<number, symbol>>>({});
	#scanProgress = $state.raw<ScanProgress | null>(null);
	#enrichment = $state.raw<Enrichment | null>(null);

	thumbnails = $state.raw<Readonly<Record<number, Thumbnail>>>({});

	readonly isScanning = $derived(this.#gameId in this.#scans);
	readonly scanProgress = $derived(
		this.#scanProgress?.app_id === this.#gameId ? this.#scanProgress : null
	);
	readonly enrichment = $derived(
		this.#enrichment?.app_id === this.#gameId ? this.#enrichment : null
	);

	constructor() {
		super();
		$effect(() => {
			const gameId = this.#gameId;
			if (!gameId) return;
			untrack(() => this.scan());
			return () => this.cancel(gameId);
		});
		$effect(() => {
			const unlisten = listen<ScanProgress>(
				'library-scan-progress',
				(event) => (this.#scanProgress = event.payload)
			);
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			const unlisten = listen<Thumbnail[]>(
				'library-thumbnails',
				(event) => {
					const added = Object.fromEntries(
						event.payload.map((thumbnail) => [
							thumbnail.mod_id,
							thumbnail,
						])
					);
					this.thumbnails = { ...this.thumbnails, ...added };
				}
			);
			return () => void unlisten.then((off) => off());
		});
	}

	async scan(options: ScanOptions = {}): Promise<void> {
		const game = this.#gamesStore.current!;
		if (game.app_id in this.#scans) return;
		const scanId = Symbol();
		this.#scans = { ...this.#scans, [game.app_id]: scanId };
		try {
			const full = options.full || LibraryScanStore.isSyncDue(game);
			const startedAt = performance.now();
			const scan = await invoke<LibraryScan | null>('scan_library', {
				app_id: game.app_id,
				full,
				known: await LibraryScanStore.knownSteamMods(game.app_id),
			});
			if (!scan) return;
			const scannedAt = performance.now();
			const createdRefs = await this.applyScan(game, scan);
			if (import.meta.env.DEV)
				console.debug(
					`scan ${full ? 'full' : 'light'}: rust ${Math.round(scannedAt - startedAt)} ms, store ${Math.round(performance.now() - scannedAt)} ms, ${scan.mods.length} mods, ${scan.pending_details.length} to enrich`
				);
			await this.requestThumbnails(game.app_id);
			this.resumeDownloads(game.app_id, scan);
			if (!scan.pending_details.length) {
				if (full && scan.steam_view === 'subscriptions')
					await game.row!.update({ steam_synced_at: unixNow() });
				return;
			}
			const isEnriched = await this.enrich(
				game,
				scanId,
				scan.pending_details,
				createdRefs,
				full
			);
			if (isEnriched && full)
				await game.row!.update({ steam_synced_at: unixNow() });
			await this.requestThumbnails(game.app_id);
		} finally {
			if (this.#scans[game.app_id] === scanId) {
				this.#scans = LibraryScanStore.without(
					this.#scans,
					game.app_id
				);
				this.#scanProgress = null;
			}
		}
	}

	async requestThumbnails(gameId: number): Promise<void> {
		const mods = await Mod.query().where('game_id', gameId).toArray();
		await invoke('request_thumbnails', {
			app_id: gameId,
			sources: mods.map((mod) => ({
				mod_id: mod.id,
				file: mod.coverFile,
				url: mod.preview_url,
			})),
		});
	}

	private resumeDownloads(appId: number, scan: LibraryScan): void {
		const pending = scan.mods.flatMap((mod) =>
			mod.source === 'steam' && mod.download_pending
				? [mod.source_ref]
				: []
		);
		if (pending.length)
			void WorkshopDownloadsStore.get().resume(appId, pending);
	}

	private cancel(gameId: number): void {
		this.#scans = LibraryScanStore.without(this.#scans, gameId);
		void invoke('cancel_library_scan', { app_id: gameId });
	}

	private async applyScan(
		game: GameEntry,
		scan: LibraryScan
	): Promise<ReadonlySet<string>> {
		const createdRefs = new SvelteSet<string>();
		await Model.database.transaction(async (tx) => {
			const known = await Mod.query()
				.where('game_id', game.app_id)
				.toArray(tx);
			const scanned = Map.groupBy(scan.mods, (mod) =>
				LibraryScanStore.identityKey(mod.source, mod.source_ref)
			);
			const now = unixNow();
			for (const mod of known) {
				const key = LibraryScanStore.identityKey(
					mod.source,
					mod.source_ref
				);
				const found = scanned.get(key)?.[0];
				if (found?.unchanged) {
					mod.fill({ missing_since: null });
					scanned.delete(key);
				} else if (found) {
					mod.fill(LibraryScanStore.scannedColumns(found));
					scanned.delete(key);
				} else if (LibraryScanStore.canGoMissing(mod, scan)) {
					mod.fill({
						missing_since: mod.missing_since ?? now,
						problem:
							mod.source === 'steam' &&
							scan.steam_view === 'subscriptions'
								? 'unsubscribed'
								: 'folder_removed',
					});
				}
			}
			await Mod.updateMany(known, tx);
			const added = [...scanned.values()].map(([mod]) => mod);
			await Mod.createMany(
				added.map((mod) => ({
					game_id: game.app_id,
					source: mod.source === 'steam' ? 'steam' : 'manual',
					source_ref: mod.source_ref,
					title: mod.title ?? mod.source_ref,
					seen_updated_at: null,
					...LibraryScanStore.scannedColumns(mod),
				})),
				tx
			);
			for (const mod of added)
				if (mod.source === 'steam') createdRefs.add(mod.source_ref);
			await game.row!.update({ scanned_at: now }, tx);
		});
		return createdRefs;
	}

	private async enrich(
		game: GameEntry,
		scanId: symbol,
		refs: readonly string[],
		createdRefs: ReadonlySet<string>,
		full: boolean
	): Promise<boolean> {
		this.#enrichment = {
			app_id: game.app_id,
			step: 'details',
			done: 0,
			total: refs.length,
		};
		try {
			for (let start = 0; start < refs.length; start += DETAILS_CHUNK) {
				if (this.#scans[game.app_id] !== scanId) return false;
				const chunk = refs.slice(start, start + DETAILS_CHUNK);
				const details = await invoke<ModDetails[]>(
					'fetch_mod_details',
					{
						app_id: game.app_id,
						item_ids: chunk.map(Number),
					}
				);
				await this.applyDetails(game.app_id, details, createdRefs);
				this.#enrichment = {
					...this.#enrichment,
					done: Math.min(start + chunk.length, refs.length),
				};
			}
			if (!full) return true;
			if (this.#scans[game.app_id] !== scanId) return false;
			this.#enrichment = { ...this.#enrichment, step: 'times' };
			const times = await invoke<SubscriptionTime[]>(
				'fetch_subscription_times',
				{ app_id: game.app_id }
			);
			await this.applySubscriptionTimes(game.app_id, times);
			return true;
		} catch (error) {
			console.debug('Steam details unavailable', error);
			return false;
		} finally {
			this.#enrichment = null;
		}
	}

	private async applyDetails(
		gameId: number,
		details: readonly ModDetails[],
		createdRefs: ReadonlySet<string>
	): Promise<void> {
		await Model.database.transaction(async (tx) => {
			const mods = await Mod.query().where('game_id', gameId).toArray(tx);
			const byRef = Object.fromEntries(
				mods
					.filter((mod) => mod.source === 'steam')
					.map((mod) => [mod.source_ref, mod])
			) as Record<string, Mod>;
			const detailed: { mod: Mod; steam: SteamDetails }[] = [];
			for (const { source_ref, steam } of details) {
				const mod = byRef[source_ref];
				if (!mod) continue;
				mod.fill({
					...LibraryScanStore.steamColumns(steam),
					...(mod.seen_updated_at === null && {
						seen_updated_at: steam.remote_updated_at,
					}),
				});
				detailed.push({ mod, steam });
			}
			await Mod.updateMany(
				detailed.map(({ mod }) => mod),
				tx
			);
			await LibraryScanStore.applySteamTags(
				gameId,
				detailed
					.filter(({ mod }) => createdRefs.has(mod.source_ref))
					.map(({ mod, steam }) => ({ mod, names: steam.tags })),
				tx
			);
			await LibraryScanStore.saveSteamDependencies(detailed, tx);
		});
	}

	private async applySubscriptionTimes(
		gameId: number,
		times: readonly SubscriptionTime[]
	): Promise<void> {
		await Model.database.transaction(async (tx) => {
			const mods = await Mod.query().where('game_id', gameId).toArray(tx);
			const byRef = Object.fromEntries(
				times.map((time) => [
					String(time.item_id),
					time.time_subscribed,
				])
			) as Record<string, number>;
			const changed = mods.filter(
				(mod) =>
					mod.source === 'steam' &&
					mod.source_ref in byRef &&
					LibraryScanStore.unix(mod.added_at) !==
						byRef[mod.source_ref]
			);
			for (const mod of changed)
				mod.fill({ added_at: byRef[mod.source_ref] });
			await Mod.updateMany(changed, tx);
		});
	}

	private static isSyncDue(game: GameEntry): boolean {
		const syncedAt = game.row?.steam_synced_at ?? null;
		return (
			syncedAt === null ||
			Date.now() - syncedAt.getTime() > STEAM_SYNC_EVERY_MS
		);
	}

	private static async knownSteamMods(gameId: number): Promise<KnownMod[]> {
		const mods = await Mod.query().where('game_id', gameId).toArray();
		return mods
			.filter((mod) => mod.source === 'steam')
			.map((mod) => ({
				source_ref: mod.source_ref,
				installed_updated_at: LibraryScanStore.unix(
					mod.installed_updated_at
				),
				remote_updated_at: LibraryScanStore.unix(mod.remote_updated_at),
				size_bytes: mod.size_bytes,
			}));
	}

	private static unix(date: Date | null): number | null {
		return date === null ? null : Math.round(date.getTime() / 1000);
	}

	private static identityKey(
		source: ModSource | LibraryMod['source'],
		sourceRef: string
	): string {
		return `${source === 'steam' ? 'steam' : 'local'}:${sourceRef}`;
	}

	private static canGoMissing(mod: Mod, scan: LibraryScan): boolean {
		if (mod.source === 'base') return false;
		return mod.source !== 'steam' || scan.steam_view !== 'unreachable';
	}

	private static scannedColumns(mod: LibraryMod) {
		return {
			folder: mod.folder,
			game_ref: mod.game_ref,
			preview_file: mod.preview_file,
			size_bytes: mod.size_bytes,
			problem: mod.problem,
			installed_updated_at: mod.installed_updated_at,
			missing_since: null,
			...(mod.added_at !== null && { added_at: mod.added_at }),
		};
	}

	private static steamColumns(steam: SteamDetails) {
		return {
			title: steam.title,
			description: steam.description,
			author_name: steam.author_name,
			author_ref: steam.author_ref,
			page_url: steam.page_url,
			preview_url: steam.preview_url,
			published_at: steam.published_at,
			remote_updated_at: steam.remote_updated_at,
		};
	}

	private static async applySteamTags(
		gameId: number,
		tagged: readonly { mod: Mod; names: readonly string[] }[],
		tx: Transaction
	): Promise<void> {
		const names = LibraryScanStore.unique(
			tagged.flatMap(({ names }) => names)
		);
		if (!names.length) return;
		const existing = await Tag.query().where('game_id', gameId).toArray(tx);
		const missing = names.filter(
			(name) =>
				!existing.some(
					(tag) => tag.name.toLowerCase() === name.toLowerCase()
				)
		);
		const tags = [
			...existing,
			...(await Tag.createMany(
				missing.map((name) => ({
					game_id: gameId,
					name,
					color: 'ash' as const,
				})),
				tx
			)),
		];
		await ModTag.createMany(
			tagged.flatMap(({ mod, names }) =>
				LibraryScanStore.unique(names).flatMap((name) => {
					const tag = tags.find(
						(tag) => tag.name.toLowerCase() === name.toLowerCase()
					);
					return tag ? [{ mod_id: mod.id, tag_id: tag.id }] : [];
				})
			),
			tx
		);
	}

	private static async saveSteamDependencies(
		mods: readonly { mod: Mod; steam: SteamDetails }[],
		tx: Transaction
	): Promise<void> {
		if (!mods.length) return;
		const previous = await ModDependency.query()
			.whereIn(
				'mod_id',
				mods.map(({ mod }) => mod.id)
			)
			.where('origin', 'steam')
			.toArray(tx);
		await ModDependency.deleteMany(previous, tx);
		await ModDependency.createMany(
			mods.flatMap(({ mod, steam }) =>
				steam.required.map((required) => ({
					mod_id: mod.id,
					required_ref: required.item_ref,
					required_title: required.title,
					optional: false,
					origin: 'steam' as const,
				}))
			),
			tx
		);
	}

	private static unique(names: readonly string[]): string[] {
		return names.filter((name, index) => names.indexOf(name) === index);
	}

	private static without<T>(
		record: Readonly<Record<number, T>>,
		key: number
	): Record<number, T> {
		return Object.fromEntries(
			Object.entries(record).filter(([entry]) => Number(entry) !== key)
		);
	}
}
