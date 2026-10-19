import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { untrack } from 'svelte';

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
import { GamesStore, ProfilesStore, TagsStore } from '@/lib/store';
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
	steam: SteamDetails | null;
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
	readonly isScanning = $derived(this.#gameId in this.#scans);
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

	async scan(): Promise<void> {
		const game = this.#gamesStore.current!;
		if (game.app_id in this.#scans) return;
		const scanId = Symbol();
		this.#scans = { ...this.#scans, [game.app_id]: scanId };
		try {
			const scan = await invoke<LibraryScan | null>('scan_library', {
				app_id: game.app_id,
			});
			if (!scan) return;
			await Model.database.transaction(async (tx) => {
				const known = await Mod.query()
					.where('game_id', game.app_id)
					.toArray(tx);
				const scanned = Map.groupBy(scan.mods, (mod) =>
					LibraryStore.identityKey(mod.source, mod.source_ref)
				);
				const now = unixNow();
				const withSteam: { mod: Mod; steam: SteamDetails }[] = [];
				for (const mod of known) {
					const key = LibraryStore.identityKey(
						mod.source,
						mod.source_ref
					);
					const found = scanned.get(key)?.[0];
					if (found) {
						mod.fill(LibraryStore.scannedColumns(found));
						if (found.steam) {
							withSteam.push({ mod, steam: found.steam });
							if (mod.seen_updated_at === null)
								mod.fill({
									seen_updated_at:
										found.steam.remote_updated_at,
								});
						}
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
				const created = await Mod.createMany(
					added.map((mod) => ({
						game_id: game.app_id,
						source: mod.source === 'steam' ? 'steam' : 'manual',
						source_ref: mod.source_ref,
						title: LibraryStore.titleOf(mod),
						seen_updated_at: mod.steam?.remote_updated_at ?? null,
						...LibraryStore.scannedColumns(mod),
					})),
					tx
				);
				await LibraryStore.applySteamTags(
					game.app_id,
					created.map((mod, index) => ({
						mod,
						names: added[index].steam?.tags ?? [],
					})),
					tx
				);
				created.forEach((mod, index) => {
					const steam = added[index].steam;
					if (steam) withSteam.push({ mod, steam });
				});
				await LibraryStore.saveSteamDependencies(withSteam, tx);
				await game.row!.update({ scanned_at: now }, tx);
			});
			await this.requestThumbnails(game.app_id);
		} finally {
			if (this.#scans[game.app_id] === scanId) {
				this.#scans = LibraryStore.without(this.#scans, game.app_id);
				this.#scanProgress = null;
			}
		}
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
		return mod.steam?.title ?? mod.title ?? mod.source_ref;
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
			...(mod.steam && {
				title: mod.steam.title,
				description: mod.steam.description,
				author_name: mod.steam.author_name,
				author_ref: mod.steam.author_ref,
				page_url: mod.steam.page_url,
				preview_url: mod.steam.preview_url,
				published_at: mod.steam.published_at,
				remote_updated_at: mod.steam.remote_updated_at,
			}),
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
