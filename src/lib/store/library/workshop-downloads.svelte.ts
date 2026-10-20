import { ConnectionStore, Model } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';

import { Mod } from '@/lib/models';
import { GamesStore, LibraryScanStore } from '@/lib/store';

export type WorkshopDownloadKind = 'import' | 'resume';

export type WorkshopDownloadStatus =
	| 'queued'
	| 'downloading'
	| 'installed'
	| 'subscribe_failed'
	| 'unsubscribed';

export type WorkshopDownload = {
	source_ref: string;
	title: string;
	status: WorkshopDownloadStatus;
	downloaded_bytes: number;
	total_bytes: number | null;
	error: string | null;
};

export type WatchItem = {
	source_ref: string;
	title: string;
};

type SubscribedMods = {
	subscribed: number[];
	failures: { item_id: number; reason: string }[];
};

type ItemDownload = {
	source_ref: string;
	status: 'queued' | 'downloading' | 'installed' | 'unsubscribed';
	downloaded_bytes: number;
	total_bytes: number | null;
};

type Sample = {
	at: number;
	bytes: number;
};

const POLL_EVERY_MS = 2000;
const RATE_WINDOW_MS = 30_000;
const PENDING: readonly WorkshopDownloadStatus[] = ['queued', 'downloading'];
const PROBLEMS: readonly WorkshopDownloadStatus[] = [
	'subscribe_failed',
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
		this.items.filter((item) => item.status === 'installed').length
	);
	readonly failed = $derived(
		this.items.filter((item) => PROBLEMS.includes(item.status)).length
	);
	readonly isActive = $derived(this.pending.length > 0);
	readonly isFinished = $derived(this.total > 0 && !this.isActive);
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
		if (!refs.length) return;
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
		items: readonly WorkshopDownload[]
	): void {
		this.stopPolling();
		this.#appId = appId;
		this.#kind = kind;
		this.#items = items;
		this.#samples = [];
		this.#needsScan = false;
		this.schedule(0);
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
			if (found.status === 'installed') finished++;
			return {
				...item,
				status: found.status,
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

	private sample(): void {
		const now = Date.now();
		const bytes = this.#items.reduce(
			(sum, item) =>
				sum +
				(item.status === 'installed'
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
		error: string | null
	): WorkshopDownload {
		return {
			source_ref: item.source_ref,
			title: item.title,
			status,
			downloaded_bytes: 0,
			total_bytes: null,
			error,
		};
	}
}
