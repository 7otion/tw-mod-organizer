import { ConnectionStore, Model } from '@7otion-tauri/orm';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

import {
	Group,
	GroupMember,
	Mod,
	ModDependency,
	ModTag,
	ProfileEntry,
	Tag,
	type Profile,
} from '@/lib/models';
import {
	GamesStore,
	LibraryScanStore,
	ProfilesStore,
	TagsStore,
} from '@/lib/store';
import { t } from '@/lib/i18n';
import { unixNow } from '@/lib/utils';

type SubscribedMods = {
	subscribed: number[];
	failures: string[];
};

type RemovedMods = {
	unsubscribed: number[];
	trashed: string[];
	failures: string[];
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
	readonly #scanStore = LibraryScanStore.get();
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
		await this.#scanStore.requestThumbnails(mod.game_id);
	}

	async markSeen(mod: Mod): Promise<void> {
		await mod.update({ seen_updated_at: mod.remote_updated_at });
	}

	async subscribe(itemRefs: readonly string[]): Promise<void> {
		const result = await invoke<SubscribedMods>('subscribe_mods', {
			app_id: this.#gamesStore.current!.app_id,
			item_ids: itemRefs.map(Number),
		});
		if (result.subscribed.length) await this.#scanStore.scan();
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

	private static byId<T extends { id: number }>(
		rows: readonly T[]
	): Record<number, T> {
		return Object.fromEntries(rows.map((row) => [row.id, row]));
	}
}
