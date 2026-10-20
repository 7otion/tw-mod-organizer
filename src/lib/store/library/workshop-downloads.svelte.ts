import { ConnectionStore, Model } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';

import { Mod } from '@/lib/models';
import { GamesStore, LibraryScanStore } from '@/lib/store';

export type WorkshopDownloadKind = 'import' | 'resume' | 'update';

export type WorkshopDownloadStatus =
	| 'queued'
	| 'downloading'
	| 'installed'
	| 'up_to_date'
	| 'updated'
	| 'subscribe_failed'
	| 'update_failed'
	| 'unsubscribed';

export type WorkshopDownload = {
	source_ref: string;
	title: string;
	status: WorkshopDownloadStatus;
	downloaded_bytes: number;
	total_bytes: number | null;
	installed_updated_at: number | null;
	error: string | null;
};

export type WatchItem = {
	source_ref: string;
	title: string;
};

export type UpdateItem = WatchItem & {
	installed_updated_at: number | null;
};

type SubscribedMods = {
	subscribed: number[];
	failures: { item_id: number; reason: string }[];
};

type UpdateRequest = {
	source_ref: string;
	status: 'queued' | 'up_to_date' | 'update_failed';
	error: string | null;
};

type ItemDownload = {
	source_ref: string;
	status: 'queued' | 'downloading' | 'installed' | 'unsubscribed';
	downloaded_bytes: number;
	total_bytes: number | null;
	installed_updated_at: number | null;
};

type Sample = {
	at: number;
	bytes: number;
};

const POLL_EVERY_MS = 2000;
const RATE_WINDOW_MS = 30_000;
const PENDING: readonly WorkshopDownloadStatus[] = ['queued', 'downloading'];
const DONE: readonly WorkshopDownloadStatus[] = [
	'installed',
	'up_to_date',
	'updated',
];
const PROBLEMS: readonly WorkshopDownloadStatus[] = [
	'subscribe_failed',
	'update_failed',
	'unsubscribed',
];

export class WorkshopDownloadsStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #scanStore = LibraryScanStore.get();

	#appId = $state(0);
	#kind = $state<WorkshopDownloadKind>('import');
	#items = $state.raw<readonly WorkshopDownload[]>([]);
	#samples = $state.raw<readonly Sample[]>([]);
	#timer: ReturnType<typeof setTimeout> | null = null;
	#needsScan = false;
	#isStopping = $state(false);

	isOpen = $state(false);

	readonly kind = $derived(this.#kind);
	readonly isStopping = $derived(this.#isStopping);
	readonly isCurrentGame = $derived(
		this.#appId !== 0 && this.#appId === this.#gamesStore.current?.app_id
	);
	readonly items = $derived(this.isCurrentGame ? this.#items : []);
	readonly total = $derived(this.items.length);
	readonly pending = $derived(
		this.items.filter((item) => PENDING.includes(item.status))
	);
	readonly done = $derived(
		this.items.filter((item) => DONE.includes(item.status)).length
	);
	readonly failed = $derived(
		this.items.filter((item) => PROBLEMS.includes(item.status)).length
	);
	readonly isActive = $derived(this.pending.length > 0);
	readonly isFinished = $derived(this.total > 0 && !this.isActive);
	readonly canStop = $derived(this.isActive && this.#kind !== 'update');
	readonly secondsLeft = $derived.by((): number | null => {
		if (!this.isActive) return null;
		const [first] = this.#samples;
		const last = this.#samples.at(-1);
		if (!first || !last || last.at - first.at < POLL_EVERY_MS) return null;
		const rate = ((last.bytes - first.bytes) * 1000) / (last.at - first.at);
		if (rate <= 0) return null;
		let remaining = 0;
		for (const item of this.pending) {
			if (item.total_bytes === null) return null;
			remaining += item.total_bytes - item.downloaded_bytes;
		}
		return Math.max(0, Math.round(remaining / rate));
	});

	async subscribe(items: readonly WatchItem[]): Promise<void> {
		const game = this.#gamesStore.current!;
		const result = await invoke<SubscribedMods>('subscribe_mods', {
			app_id: game.app_id,
			item_ids: items.map((item) => Number(item.source_ref)),
		});
		const reasons = Object.fromEntries(
			result.failures.map((failure) => [
				String(failure.item_id),
				failure.reason,
			])
		) as Record<string, string | undefined>;
		this.start(
			game.app_id,
			'import',
			items.map((item) => {
				const reason = reasons[item.source_ref];
				return WorkshopDownloadsStore.entry(
					item,
					reason === undefined ? 'queued' : 'subscribe_failed',
					reason ?? null
				);
			})
		);
		this.isOpen = true;
		if (result.subscribed.length) await this.#scanStore.scan();
	}

	async forceUpdate(items: readonly UpdateItem[]): Promise<void> {
		const game = this.#gamesStore.current!;
		this.start(
			game.app_id,
			'update',
			items.map((item) =>
				WorkshopDownloadsStore.entry(
					item,
					'queued',
					null,
					item.installed_updated_at
				)
			),
			false
		);
		this.isOpen = true;
		let requests: UpdateRequest[];
		try {
			requests = await invoke<UpdateRequest[]>('force_update_mods', {
				app_id: game.app_id,
				item_ids: items.map((item) => Number(item.source_ref)),
			});
		} catch (error) {
			if (this.#appId !== game.app_id) return;
			this.#items = this.#items.map((item) => ({
				...item,
				status: 'update_failed',
				error: String(error),
			}));
			return;
		}
		if (this.#appId !== game.app_id || this.#kind !== 'update') return;
		const byRef = Object.fromEntries(
			requests.map((request) => [request.source_ref, request])
		) as Record<string, UpdateRequest | undefined>;
		this.#items = this.#items.map((item) => {
			const request = byRef[item.source_ref];
			return {
				...item,
				status: request?.status ?? 'update_failed',
				error: request?.error ?? null,
			};
		});
		this.schedule(0);
	}

	async resume(appId: number, refs: readonly string[]): Promise<void> {
		if (this.#appId === appId && this.isActive) return;
		const mods = await Mod.query()
			.where('game_id', appId)
			.whereIn('source_ref', [...refs])
			.toArray();
		this.start(
			appId,
			'resume',
			mods.map((mod) =>
				WorkshopDownloadsStore.entry(
					{ source_ref: mod.source_ref, title: mod.displayTitle },
					'queued',
					null
				)
			)
		);
	}

	async stop(): Promise<void> {
		const refs = this.pending.map((item) => item.source_ref);
		if (!refs.length || !this.canStop) return;
		this.#isStopping = true;
		try {
			await invoke('remove_mods', {
				app_id: this.#appId,
				item_ids: refs.map(Number),
				folders: [],
			});
			await Model.database.transaction(async (tx) => {
				const rows = await Mod.query()
					.where('game_id', this.#appId)
					.where('source', 'steam')
					.whereIn('source_ref', refs)
					.toArray(tx);
				await Mod.deleteMany(rows, tx);
			});
			this.#items = this.#items.map((item) =>
				refs.includes(item.source_ref)
					? { ...item, status: 'unsubscribed' }
					: item
			);
			this.stopPolling();
		} finally {
			this.#isStopping = false;
		}
	}

	dismiss(): void {
		this.isOpen = false;
		if (this.isActive) return;
		this.stopPolling();
		this.#items = [];
		this.#appId = 0;
	}

	private start(
		appId: number,
		kind: WorkshopDownloadKind,
		items: readonly WorkshopDownload[],
		poll = true
	): void {
		this.stopPolling();
		this.#appId = appId;
		this.#kind = kind;
		this.#items = items;
		this.#samples = [];
		this.#needsScan = false;
		if (poll) this.schedule(0);
	}

	private schedule(delay: number): void {
		this.#timer = setTimeout(() => void this.poll(), delay);
	}

	private stopPolling(): void {
		if (this.#timer !== null) clearTimeout(this.#timer);
		this.#timer = null;
	}

	private async poll(): Promise<void> {
		this.#timer = null;
		const appId = this.#appId;
		const pending = this.#items.filter((item) =>
			PENDING.includes(item.status)
		);
		if (!pending.length) return;
		let progress: ItemDownload[];
		try {
			progress = await invoke<ItemDownload[]>('fetch_download_progress', {
				app_id: appId,
				item_ids: pending.map((item) => Number(item.source_ref)),
			});
		} catch (error) {
			console.debug('download progress unavailable', error);
			if (this.#appId === appId) this.schedule(POLL_EVERY_MS);
			return;
		}
		if (this.#appId !== appId) return;
		const byRef = Object.fromEntries(
			progress.map((item) => [item.source_ref, item])
		) as Record<string, ItemDownload | undefined>;
		let finished = 0;
		this.#items = this.#items.map((item) => {
			const found = byRef[item.source_ref];
			if (!found || !PENDING.includes(item.status)) return item;
			const status = this.statusOf(item, found);
			if (status === 'installed' || status === 'updated') finished++;
			return {
				...item,
				status,
				downloaded_bytes: found.downloaded_bytes,
				total_bytes: found.total_bytes ?? item.total_bytes,
			};
		});
		this.sample();
		if (finished) this.#needsScan = true;
		if (this.#needsScan) await this.scanIfPossible(appId);
		if (this.#items.some((item) => PENDING.includes(item.status)))
			this.schedule(POLL_EVERY_MS);
	}

	private statusOf(
		item: WorkshopDownload,
		found: ItemDownload
	): WorkshopDownloadStatus {
		if (found.status !== 'installed' || this.#kind !== 'update')
			return found.status;
		const isNewer =
			found.installed_updated_at !== null &&
			found.installed_updated_at !== item.installed_updated_at;
		return isNewer ? 'updated' : 'up_to_date';
	}

	private sample(): void {
		const now = Date.now();
		const bytes = this.#items.reduce(
			(sum, item) =>
				sum +
				(DONE.includes(item.status)
					? (item.total_bytes ?? item.downloaded_bytes)
					: item.downloaded_bytes),
			0
		);
		this.#samples = [
			...this.#samples.filter(
				(sample) => now - sample.at <= RATE_WINDOW_MS
			),
			{ at: now, bytes },
		];
	}

	private async scanIfPossible(appId: number): Promise<void> {
		if (this.#gamesStore.current?.app_id !== appId) return;
		if (this.#scanStore.isScanning) return;
		this.#needsScan = false;
		await this.#scanStore.scan();
	}

	private static entry(
		item: WatchItem,
		status: WorkshopDownloadStatus,
		error: string | null,
		installedUpdatedAt: number | null = null
	): WorkshopDownload {
		return {
			source_ref: item.source_ref,
			title: item.title,
			status,
			downloaded_bytes: 0,
			total_bytes: null,
			installed_updated_at: installedUpdatedAt,
			error,
		};
	}
}
