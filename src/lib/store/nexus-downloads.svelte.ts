import { ConnectionStore, Model } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { untrack } from 'svelte';
import { toast } from 'svelte-sonner';

import { t } from '@/lib/i18n';
import { Download } from '@/lib/models';
import { keyBetween } from '@/lib/position';
import { toastError, unixNow } from '@/lib/utils';

import { AppStore } from './app.svelte';
import { GamesStore } from './games.svelte';
import { LibraryScanStore, LibraryStore } from './library';
import { NexusStore } from './nexus.svelte';
import { SettingsStore } from './settings.svelte';

export const DOWNLOAD_FILTERS = [
	'all',
	'active',
	'paused',
	'failed',
	'ready',
	'hidden',
] as const;
export type DownloadFilter = (typeof DOWNLOAD_FILTERS)[number];

export type Transfer = {
	received: number;
	total: number | null;
};

type ResolvedLink = {
	link: {
		domain: string;
		mod_id: number;
		file_id: number;
		key: string | null;
		expires: number | null;
	};
	title: string;
	version: string | null;
	author_name: string | null;
	page_url: string;
	preview_url: string | null;
	file_name: string;
	total_bytes: number | null;
};

type Sample = {
	at: number;
	bytes: number;
};

const SAMPLE_WINDOW_MS = 5000;
const NXM_PREFIX = 'nxm://';

export class NexusDownloadsStore extends ConnectionStore {
	readonly #appStore = AppStore.get();
	readonly #gamesStore = GamesStore.get();
	readonly #libraryStore = LibraryStore.get();
	readonly #scanStore = LibraryScanStore.get();
	readonly #nexusStore = NexusStore.get();
	readonly #settingsStore = SettingsStore.get();
	readonly #gameId = $derived(this.#gamesStore.current?.app_id ?? 0);
	readonly #rows = this.query(() =>
		Download.query().where('game_id', this.#gameId).orderBy('position')
	);

	#activeId: number | null = null;
	#isPumping = false;
	#isReconciled = false;
	#samples = $state.raw<readonly Sample[]>([]);
	filter = $state<DownloadFilter>('all');
	transfers = $state.raw<Record<number, Transfer>>({});

	readonly all = $derived(this.#rows.rows);
	readonly isLoaded = $derived(this.#rows.loaded);
	readonly active = $derived(
		this.all.filter(
			(download) =>
				download.status === 'downloading' ||
				download.status === 'queued'
		)
	);
	readonly ready = $derived(
		this.all.filter(
			(download) =>
				download.status === 'completed' &&
				!this.isInstalled(download) &&
				!download.hidden
		)
	);
	readonly shown = $derived(
		this.all.filter((download) => this.matches(download, this.filter))
	);
	readonly speed = $derived.by((): number | null => {
		const [first] = this.#samples;
		const last = this.#samples.at(-1);
		if (!first || !last || last.at === first.at) return null;
		const rate = ((last.bytes - first.bytes) * 1000) / (last.at - first.at);
		return rate > 0 ? rate : null;
	});

	constructor() {
		super();
		$effect(() => {
			const unlisten = listen<{
				id: number;
				received: number;
				total: number | null;
			}>('download-progress', (event) => this.onProgress(event.payload));
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			const unlisten = listen<{
				id: number;
				path: string;
				received: number;
			}>('download-done', (event) => void this.onDone(event.payload));
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			const unlisten = listen<{ id: number; error: string }>(
				'download-failed',
				(event) => void this.onFailed(event.payload)
			);
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			const unlisten = listen<{ id: number; received: number }>(
				'download-paused',
				(event) => void this.onPaused(event.payload)
			);
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			const unlisten = onOpenUrl((urls) => {
				for (const url of urls)
					if (url.startsWith(NXM_PREFIX)) void this.enqueue(url);
			});
			return () => void unlisten.then((off) => off());
		});
		$effect(() => {
			if (!this.isLoaded || !this.all.length) return;
			untrack(() => void this.reconcile());
		});
	}

	isInstalled(download: Download): boolean {
		if (download.mod_id === null) return false;
		const mod = this.#libraryStore.modById(download.mod_id);
		return mod !== null && !mod.isMissing;
	}

	countOf(filter: DownloadFilter): number {
		return this.all.filter((download) => this.matches(download, filter))
			.length;
	}

	transferOf(download: Download): Transfer {
		return (
			this.transfers[download.id] ?? {
				received: download.received_bytes,
				total: download.total_bytes,
			}
		);
	}

	isNext(download: Download): boolean {
		return (
			this.#activeId === null &&
			this.all.find((item) => item.status === 'queued') === download
		);
	}

	async enqueue(link: string): Promise<void> {
		const apiKey = this.#nexusStore.apiKey;
		if (!apiKey) {
			toast.error(t('downloads.errors.notConnected'));
			return;
		}
		let resolved: ResolvedLink;
		try {
			resolved = await invoke<ResolvedLink>('resolve_nxm_link', {
				api_key: apiKey,
				link,
			});
		} catch (error) {
			toastError(error);
			return;
		}
		const game = this.#gamesStore.list.find(
			(candidate) => candidate.nexus_domain === resolved.link.domain
		);
		if (!game) {
			toast.error(t('downloads.errors.unsupportedGame'));
			return;
		}
		const last = await Download.query()
			.where('game_id', game.app_id)
			.orderBy('position', 'desc')
			.first();
		await Download.updateOrCreate(
			{ game_id: game.app_id, nexus_file_id: resolved.link.file_id },
			{
				nexus_mod_id: resolved.link.mod_id,
				file_name: resolved.file_name,
				title: resolved.title,
				position: keyBetween(last?.position ?? null, null),
				version: resolved.version,
				author_name: resolved.author_name,
				page_url: resolved.page_url,
				preview_url: resolved.preview_url,
				total_bytes: resolved.total_bytes,
				received_bytes: 0,
				status: 'queued',
				error: null,
				nxm_key: resolved.link.key,
				nxm_expires_at: resolved.link.expires,
				archive_path: null,
				mod_id: null,
				hidden: false,
				completed_at: null,
			}
		);
		toast.success(
			game.app_id === this.#gameId
				? t('downloads.toasts.queued', { title: resolved.title })
				: t('downloads.toasts.queuedFor', {
						title: resolved.title,
						game: game.title,
					})
		);
		await this.pump();
	}

	async pause(download: Download): Promise<void> {
		await invoke('pause_download', { id: download.id });
	}

	async resume(download: Download): Promise<void> {
		await download.update({ status: 'queued', error: null });
		await this.pump();
	}

	async remove(download: Download): Promise<void> {
		if (this.#activeId === download.id) await this.pause(download);
		await invoke('discard_download_file', {
			target: this.targetOf(download),
		});
		await download.delete();
		await this.pump();
	}

	async setHidden(download: Download, hidden: boolean): Promise<void> {
		await download.update({ hidden });
	}

	install(download: Download): void {
		if (download.archive_path)
			this.#appStore.openInstallMod(download.archive_path);
	}

	async linkInstalled(
		sourcePath: string | null,
		folders: readonly string[]
	): Promise<void> {
		if (!sourcePath) return;
		const download = this.all.find(
			(item) => item.archive_path === sourcePath
		);
		if (!download) return;
		const mods = this.#libraryStore.list.filter(
			(mod) => mod.folder !== null && folders.includes(mod.folder)
		);
		if (!mods.length) return;
		const game = this.#gamesStore.list.find(
			(candidate) => candidate.app_id === download.game_id
		);
		const details = game
			? await this.#nexusStore
					.modDetails(game.nexus_domain, download.nexus_mod_id)
					.catch(() => null)
			: null;
		const now = unixNow();
		for (const mod of mods)
			await mod.update({
				source: 'nexus',
				nexus_mod_id: download.nexus_mod_id,
				nexus_file_id: download.nexus_file_id,
				title: details?.name ?? download.title,
				description: details?.description ?? details?.summary ?? null,
				version: download.version,
				page_url: download.page_url,
				author_name: details?.author ?? download.author_name,
				author_ref: details?.uploaded_by ?? null,
				preview_url: details?.picture_url ?? download.preview_url,
				published_at: details?.created_timestamp ?? null,
				remote_version: null,
				remote_updated_at: now,
				seen_updated_at: now,
			});
		if (details?.tags.length)
			await Model.database.transaction((tx) =>
				LibraryScanStore.applyTags(
					download.game_id,
					mods.map((mod) => ({ mod, names: details.tags })),
					tx
				)
			);
		await download.update({ mod_id: mods[0].id });
		await this.#scanStore.requestThumbnails(download.game_id);
	}

	private matches(download: Download, filter: DownloadFilter): boolean {
		switch (filter) {
			case 'all':
				return !download.hidden;
			case 'active':
				return (
					!download.hidden &&
					(download.status === 'downloading' ||
						download.status === 'queued')
				);
			case 'paused':
				return !download.hidden && download.status === 'paused';
			case 'failed':
				return !download.hidden && download.status === 'failed';
			case 'ready':
				return (
					!download.hidden &&
					download.status === 'completed' &&
					!this.isInstalled(download)
				);
			case 'hidden':
				return download.hidden;
		}
	}

	private targetOf(download: Download): string {
		return (
			download.archive_path ??
			`${this.#settingsStore.current!.downloads_dir}\\${download.file_name}`
		);
	}

	private async reconcile(): Promise<void> {
		if (!this.#isReconciled) {
			this.#isReconciled = true;
			const interrupted = this.all.filter(
				(download) => download.status === 'downloading'
			);
			for (const download of interrupted)
				download.draft().status = 'paused';
			if (interrupted.length) await Download.updateMany(interrupted);
		}
		await this.pump();
	}

	private async pump(): Promise<void> {
		if (this.#isPumping || this.#activeId !== null) return;
		const next = this.all.find((download) => download.status === 'queued');
		if (!next) return;
		this.#isPumping = true;
		try {
			await this.start(next);
		} catch (error) {
			this.#activeId = null;
			await next.update({ status: 'failed', error: String(error) });
		} finally {
			this.#isPumping = false;
		}
	}

	private async start(download: Download): Promise<void> {
		const game = this.#gamesStore.list.find(
			(candidate) => candidate.app_id === download.game_id
		);
		const apiKey = this.#nexusStore.apiKey;
		if (!game || !apiKey) {
			await download.update({
				status: 'failed',
				error: t('downloads.errors.notConnected'),
			});
			return;
		}
		const expiresAt = download.nxm_expires_at;
		if (expiresAt && expiresAt.getTime() / 1000 < unixNow()) {
			await download.update({
				status: 'failed',
				error: t('downloads.errors.expired'),
			});
			return;
		}
		const url = await invoke<string>('nexus_download_url', {
			api_key: apiKey,
			domain: game.nexus_domain,
			mod_id: download.nexus_mod_id,
			file_id: download.nexus_file_id,
			key: download.nxm_key,
			expires: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
		});
		this.#activeId = download.id;
		this.#samples = [];
		await download.update({ status: 'downloading', error: null });
		await invoke('start_download', {
			id: download.id,
			url,
			target: this.targetOf(download),
			resume: download.received_bytes > 0,
		});
	}

	private onProgress(payload: {
		id: number;
		received: number;
		total: number | null;
	}): void {
		this.transfers = {
			...this.transfers,
			[payload.id]: { received: payload.received, total: payload.total },
		};
		const at = Date.now();
		this.#samples = [
			...this.#samples.filter(
				(sample) => at - sample.at <= SAMPLE_WINDOW_MS
			),
			{ at, bytes: payload.received },
		];
	}

	private async onDone(payload: {
		id: number;
		path: string;
		received: number;
	}): Promise<void> {
		this.#activeId = null;
		this.forget(payload.id);
		const download = this.all.find((item) => item.id === payload.id);
		if (download) {
			await download.update({
				status: 'completed',
				received_bytes: payload.received,
				total_bytes: payload.received,
				archive_path: payload.path,
				completed_at: unixNow(),
				error: null,
			});
			toast.success(
				t('downloads.toasts.done', { title: download.title })
			);
		}
		await this.pump();
	}

	private async onFailed(payload: {
		id: number;
		error: string;
	}): Promise<void> {
		this.#activeId = null;
		this.forget(payload.id);
		const download = this.all.find((item) => item.id === payload.id);
		if (download)
			await download.update({ status: 'failed', error: payload.error });
		await this.pump();
	}

	private async onPaused(payload: {
		id: number;
		received: number;
	}): Promise<void> {
		this.#activeId = null;
		this.forget(payload.id);
		const download = this.all.find((item) => item.id === payload.id);
		if (download)
			await download.update({
				status: 'paused',
				received_bytes: payload.received,
			});
		await this.pump();
	}

	private forget(id: number): void {
		const rest = { ...this.transfers };
		delete rest[id];
		this.transfers = rest;
		this.#samples = [];
	}
}
