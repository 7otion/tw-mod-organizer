import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';

import {
	Group,
	GroupMember,
	Mod,
	ModDependency,
	ModTag,
	ProfileEntry,
	Tag,
	type ModSource,
	type Profile,
} from '@/lib/models';
import {
	GamesStore,
	ProfilesStore,
	TagsStore,
	type GameEntry,
} from '@/lib/store';
import { t } from '@/lib/i18n';
import { unixNow } from '@/lib/utils';

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
};

type ModDetails = {
	source_ref: string;
	steam: SteamDetails;
};

type SubscriptionTime = {
	item_id: number;
	time_subscribed: number;
};

export type Enrichment = {
	app_id: number;
	step: 'details' | 'times';
	done: number;
	total: number;
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

type SubscribedMods = {
	subscribed: number[];
	failures: string[];
};

type RemovedMods = {
	unsubscribed: number[];
	trashed: string[];
	failures: string[];
};

export type ScanProgress = {
	app_id: number;
	done: number;
	total: number;
};

export type Thumbnail = {
	mod_id: number;
	file: string;
	width: number;
	height: number;
};

type LibraryScan = {
	steam_view: 'subscriptions' | 'workshop_folder' | 'unreachable';
	mods: LibraryMod[];
	pending_details: string[];
};

export type ModPlacement = {
	profiles: { profile: Profile; isEnabled: boolean; number: number }[];
	groups: { group: Group; profiles: Profile[] }[];
	profileIds: number[];
};

export type Requirement = {
	dependency: ModDependency;
	mod: Mod | null;
};

export type ModDependencies = {
	requires: Requirement[];
	requiredBy: Mod[];
};

const NO_PLACEMENT: ModPlacement = { profiles: [], groups: [], profileIds: [] };

const STEAM_SYNC_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
const DETAILS_CHUNK = 100;

export class LibraryStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #gameId = $derived(this.#gamesStore.current?.app_id ?? 0);
	readonly #mods = this.query(() =>
		Mod.query().where('game_id', this.#gameId)
	);

	readonly #profilesStore = ProfilesStore.get();
	readonly #tagsStore = TagsStore.get();
	readonly #entries = this.query(() =>
		ProfileEntry.query().whereIn(
			'profile_id',
			this.#profilesStore.list.map((profile) => profile.id)
		)
	);
	readonly #groups = this.query(() =>
		Group.query().where('game_id', this.#gameId)
	);
	readonly #members = this.query(() =>
		GroupMember.query().whereIn(
			'group_id',
			this.#groups.rows.map((group) => group.id)
		)
	);
	readonly #dependencies = this.query(() =>
		ModDependency.query().whereIn(
			'mod_id',
			this.#mods.rows.map((mod) => mod.id)
		)
	);
	readonly #modTags = this.query(() =>
		ModTag.query().whereIn(
			'tag_id',
			this.#tagsStore.list.map((tag) => tag.id)
		)
	);

	#scans = $state.raw<Readonly<Record<number, symbol>>>({});

	#scanProgress = $state.raw<ScanProgress | null>(null);

	thumbnails = $state.raw<Readonly<Record<number, Thumbnail>>>({});

	readonly list = $derived(this.#mods.rows);
	readonly #entriesByModId = $derived(
		Map.groupBy(
			this.#entries.rows.filter((entry) => entry.mod_id !== null),
			(entry) => entry.mod_id
		)
	);
	readonly #groupLinksByGroupId = $derived(
		Map.groupBy(
			this.#entries.rows.filter((entry) => entry.group_id !== null),
			(entry) => entry.group_id
		)
	);
	readonly #entryNumbers = $derived.by(() => {
		const numbers: Record<number, number> = {};
		const byProfile = Map.groupBy(
			this.#entries.rows,
			(entry) => entry.profile_id
		);
		for (const entries of byProfile.values()) {
			let number = 0;
			const ordered = entries.toSorted((a, b) =>
				a.position < b.position ? -1 : a.position > b.position ? 1 : 0
			);
			for (const entry of ordered)
				if (entry.mod_id !== null) numbers[entry.id] = ++number;
		}
		return numbers;
	});
	readonly #membersByModId = $derived(
		this.#members.collection.groupBy('mod_id')
	);
	readonly #modTagsByModId = $derived(
		this.#modTags.collection.groupBy('mod_id')
	);
	readonly #profilesById = $derived(
		LibraryStore.byId(this.#profilesStore.list)
	);
	readonly #groupsById = $derived(LibraryStore.byId(this.#groups.rows));
	readonly #tagsById = $derived(LibraryStore.byId(this.#tagsStore.list));
	readonly #placements = $derived(
		Object.fromEntries(
			this.list.map((mod) => [mod.id, this.findPlacement(mod)])
		) as Record<number, ModPlacement>
	);
	readonly #tagsByModId = $derived(
		Object.fromEntries(
			[...this.#modTagsByModId].map(([modId, modTags]) => [
				modId,
				modTags.flatMap(
					(modTag) => this.#tagsById[modTag.tag_id] ?? []
				),
			])
		) as Record<number, Tag[]>
	);
	readonly #dependenciesByModId = $derived(
		this.#dependencies.collection.groupBy('mod_id')
	);
	readonly #dependentsByRef = $derived(
		this.#dependencies.collection.groupBy('required_ref')
	);
	readonly #steamModsByRef = $derived(
		Object.fromEntries(
			this.list
				.filter((mod) => mod.source === 'steam')
				.map((mod) => [mod.source_ref, mod])
		) as Record<string, Mod>
	);
	readonly #modsById = $derived(LibraryStore.byId(this.list));
	readonly unusedCount = $derived(
		this.list.filter((mod) => this.isUnused(mod)).length
	);
	#enrichment = $state.raw<Enrichment | null>(null);

	readonly isScanning = $derived(this.#gameId in this.#scans);
	readonly enrichment = $derived(
		this.#enrichment?.app_id === this.#gameId ? this.#enrichment : null
	);
	readonly scanProgress = $derived(
		this.#scanProgress?.app_id === this.#gameId ? this.#scanProgress : null
	);

	constructor() {
		super();
		$effect(() => {
			const gameId = this.#gameId;
			if (!gameId) return;
			untrack(() => this.scan());
			return () => this.cancelScan(gameId);
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

	placementOf(mod: Mod): ModPlacement {
		return this.#placements[mod.id] ?? NO_PLACEMENT;
	}

	isUnused(mod: Mod): boolean {
		const { profiles, groups } = this.placementOf(mod);
		return !profiles.length && !groups.length;
	}

	isInProfile(mod: Mod, profile: Profile | null): boolean {
		return (
			profile !== null &&
			this.placementOf(mod).profileIds.includes(profile.id)
		);
	}

	async remove(mods: readonly Mod[]): Promise<void> {
		const game = this.#gamesStore.current!;
		const missing = mods.filter((mod) => mod.isMissing);
		const present = mods.filter((mod) => !mod.isMissing);
		const steam = present.filter((mod) => mod.source === 'steam');
		const local = present.filter((mod) => mod.source !== 'steam');
		const removed = await invoke<RemovedMods>('remove_mods', {
			app_id: game.app_id,
			item_ids: steam.map((mod) => Number(mod.source_ref)),
			folders: local.flatMap((mod) => mod.folder ?? []),
		});
		const now = unixNow();
		const unsubscribed = steam.filter((mod) =>
			removed.unsubscribed.includes(Number(mod.source_ref))
		);
		const trashed = local.filter(
			(mod) => mod.folder !== null && removed.trashed.includes(mod.folder)
		);
		for (const mod of unsubscribed)
			mod.fill({ missing_since: now, problem: 'unsubscribed' });
		for (const mod of trashed)
			mod.fill({ missing_since: now, problem: 'folder_removed' });
		await Model.database.transaction(async (tx) => {
			await Mod.updateMany([...unsubscribed, ...trashed], tx);
			await Mod.deleteMany(missing, tx);
		});
		if (removed.failures.length)
			throw new Error(
				t('library.remove.failed', {
					failures: removed.failures.join('; '),
				})
			);
	}

	async setTag(
		mods: readonly Mod[],
		tag: Tag,
		isTagged: boolean
	): Promise<void> {
		if (isTagged) {
			await ModTag.createMany(
				mods
					.filter((mod) => !this.tagsOf(mod).includes(tag))
					.map((mod) => ({ mod_id: mod.id, tag_id: tag.id }))
			);
			return;
		}
		const modIds = mods.map((mod) => mod.id);
		await ModTag.deleteMany(
			this.#modTags.rows.filter(
				(modTag) =>
					modTag.tag_id === tag.id && modIds.includes(modTag.mod_id)
			)
		);
	}

	tagsOf(mod: Mod): Tag[] {
		return this.#tagsByModId[mod.id] ?? [];
	}

	dependenciesOf(mod: Mod): ModDependencies {
		const requires = (this.#dependenciesByModId.get(mod.id) ?? []).map(
			(dependency) => ({
				dependency,
				mod: this.#steamModsByRef[dependency.required_ref] ?? null,
			})
		);
		const requiredBy =
			mod.source === 'steam'
				? (this.#dependentsByRef.get(mod.source_ref) ?? []).flatMap(
						(dependency) => this.#modsById[dependency.mod_id] ?? []
					)
				: [];
		return { requires, requiredBy };
	}

	missingRequirementsOf(mod: Mod): ModDependency[] {
		return (this.#dependenciesByModId.get(mod.id) ?? []).filter(
			(dependency) => !(dependency.required_ref in this.#steamModsByRef)
		);
	}

	async setCustomTitle(mod: Mod, title: string | null): Promise<void> {
		const custom = title?.trim();
		await mod.update({
			custom_title: custom && custom !== mod.title ? custom : null,
		});
	}

	async setCover(mod: Mod, source: string): Promise<void> {
		const cover = await invoke<string>('set_cover_image', {
			mod_id: mod.id,
			source,
		});
		await mod.update({ custom_preview_file: cover });
		await this.requestThumbnails(mod.game_id);
	}

	async markSeen(mod: Mod): Promise<void> {
		await mod.update({ seen_updated_at: mod.remote_updated_at });
	}

	async subscribe(itemRefs: readonly string[]): Promise<void> {
		const result = await invoke<SubscribedMods>('subscribe_mods', {
			app_id: this.#gamesStore.current!.app_id,
			item_ids: itemRefs.map(Number),
		});
		if (result.subscribed.length) await this.scan();
		if (result.failures.length)
			throw new Error(
				t('library.subscribe.failed', {
					failures: result.failures.join('; '),
				})
			);
	}

	async openInSteam(mod: Mod): Promise<void> {
		await openUrl(`steam://url/CommunityFilePage/${mod.source_ref}`);
	}

	async openFolder(mod: Mod): Promise<void> {
		await invoke('open_mod_folder', { folder: mod.folder });
	}

	async openInRpfm(mod: Mod): Promise<void> {
		await invoke('open_in_rpfm', {
			pack: `${mod.folder}\\${mod.game_ref}`,
		});
	}

	async scan(options: ScanOptions = {}): Promise<void> {
		const game = this.#gamesStore.current!;
		if (game.app_id in this.#scans) return;
		const scanId = Symbol();
		this.#scans = { ...this.#scans, [game.app_id]: scanId };
		try {
			const full = options.full || LibraryStore.isSyncDue(game);
			const startedAt = performance.now();
			const scan = await invoke<LibraryScan | null>('scan_library', {
				app_id: game.app_id,
				full,
				known: await LibraryStore.knownSteamMods(game.app_id),
			});
			if (!scan) return;
			const scannedAt = performance.now();
			const createdRefs = await this.applyScan(game, scan);
			if (import.meta.env.DEV)
				console.debug(
					`scan ${full ? 'full' : 'light'}: rust ${Math.round(scannedAt - startedAt)} ms, store ${Math.round(performance.now() - scannedAt)} ms, ${scan.mods.length} mods, ${scan.pending_details.length} to enrich`
				);
			await this.requestThumbnails(game.app_id);
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
				this.#scans = LibraryStore.without(this.#scans, game.app_id);
				this.#scanProgress = null;
			}
		}
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
				LibraryStore.identityKey(mod.source, mod.source_ref)
			);
			const now = unixNow();
			for (const mod of known) {
				const key = LibraryStore.identityKey(
					mod.source,
					mod.source_ref
				);
				const found = scanned.get(key)?.[0];
				if (found?.unchanged) {
					mod.fill({ missing_since: null });
					scanned.delete(key);
				} else if (found) {
					mod.fill(LibraryStore.scannedColumns(found));
					scanned.delete(key);
				} else if (LibraryStore.canGoMissing(mod, scan)) {
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
					title: LibraryStore.titleOf(mod),
					seen_updated_at: null,
					...LibraryStore.scannedColumns(mod),
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
					...LibraryStore.steamColumns(steam),
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
			await LibraryStore.applySteamTags(
				gameId,
				detailed
					.filter(({ mod }) => createdRefs.has(mod.source_ref))
					.map(({ mod, steam }) => ({ mod, names: steam.tags })),
				tx
			);
			await LibraryStore.saveSteamDependencies(detailed, tx);
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
					LibraryStore.unix(mod.added_at) !== byRef[mod.source_ref]
			);
			for (const mod of changed)
				mod.fill({ added_at: byRef[mod.source_ref] });
			await Mod.updateMany(changed, tx);
		});
	}

	private cancelScan(gameId: number): void {
		this.#scans = LibraryStore.without(this.#scans, gameId);
		void invoke('cancel_library_scan', { app_id: gameId });
	}

	private findPlacement(mod: Mod): ModPlacement {
		const active = this.#profilesStore.active;
		const profiles = (this.#entriesByModId.get(mod.id) ?? [])
			.flatMap((entry) => {
				const profile = this.#profilesById[entry.profile_id];
				return profile
					? [
							{
								profile,
								isEnabled: entry.enabled,
								number: this.#entryNumbers[entry.id] ?? 0,
							},
						]
					: [];
			})
			.sort(
				(a, b) =>
					Number(b.profile === active) - Number(a.profile === active)
			);
		const groups = (this.#membersByModId.get(mod.id) ?? []).flatMap(
			(member) => {
				const links =
					this.#groupLinksByGroupId.get(member.group_id) ?? [];
				const group = this.#groupsById[member.group_id];
				if (!group || !links.length) return [];
				return [
					{
						group,
						profiles: links.flatMap(
							(link) => this.#profilesById[link.profile_id] ?? []
						),
					},
				];
			}
		);
		const profileIds = [
			...profiles.map(({ profile }) => profile.id),
			...groups.flatMap(({ profiles }) =>
				profiles.map((profile) => profile.id)
			),
		];
		return { profiles, groups, profileIds };
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
				installed_updated_at: LibraryStore.unix(
					mod.installed_updated_at
				),
				remote_updated_at: LibraryStore.unix(mod.remote_updated_at),
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

	private static titleOf(mod: LibraryMod): string {
		return mod.title ?? mod.source_ref;
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

	private async requestThumbnails(gameId: number): Promise<void> {
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

	private static without<T>(
		record: Readonly<Record<number, T>>,
		key: number
	): Record<number, T> {
		return Object.fromEntries(
			Object.entries(record).filter(([entry]) => Number(entry) !== key)
		);
	}

	private static byId<T extends { id: number }>(
		rows: readonly T[]
	): Record<number, T> {
		return Object.fromEntries(rows.map((row) => [row.id, row]));
	}

	private static unique(names: readonly string[]): string[] {
		return names.filter((name, index) => names.indexOf(name) === index);
	}

	private static async applySteamTags(
		gameId: number,
		tagged: readonly { mod: Mod; names: readonly string[] }[],
		tx: Transaction
	): Promise<void> {
		const names = LibraryStore.unique(tagged.flatMap(({ names }) => names));
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
				LibraryStore.unique(names).flatMap((name) => {
					const tag = tags.find(
						(tag) => tag.name.toLowerCase() === name.toLowerCase()
					);
					return tag ? [{ mod_id: mod.id, tag_id: tag.id }] : [];
				})
			),
			tx
		);
	}
}
