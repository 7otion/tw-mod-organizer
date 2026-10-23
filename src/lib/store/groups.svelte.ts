import { goto } from '$app/navigation';
import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';

import {
	Group,
	GroupMember,
	ProfileEntry,
	type Mod,
	type Profile,
	type TagColor,
} from '@/lib/models';
import { keyBetween, keysBetween, rekeyOrder } from '@/lib/position';
import { GamesStore, LibraryStore, ProfilesStore } from '@/lib/store';

export type GroupMod = {
	member: GroupMember;
	mod: Mod;
};

export class GroupsStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #libraryStore = LibraryStore.get();
	readonly #profilesStore = ProfilesStore.get();
	readonly #gameId = $derived(this.#gamesStore.current?.app_id ?? 0);
	readonly #groups = this.query(() =>
		Group.query().where('game_id', this.#gameId).orderBy('position')
	);
	readonly #members = this.query(() =>
		GroupMember.query()
			.whereIn(
				'group_id',
				this.#groups.rows.map((group) => group.id)
			)
			.orderBy('position')
	);
	readonly #links = this.query(() =>
		ProfileEntry.query().whereIn(
			'group_id',
			this.#groups.rows.map((group) => group.id)
		)
	);

	#selectedId = $state<number | null>(null);

	readonly list = $derived(this.#groups.rows);
	readonly isLoaded = $derived(this.#groups.loaded);
	readonly selected = $derived(
		this.list.find((group) => group.id === this.#selectedId) ??
			this.list[0] ??
			null
	);
	readonly #membersByGroup = $derived(
		Map.groupBy(this.#members.rows, (member) => member.group_id)
	);
	readonly #linksByGroup = $derived(
		Map.groupBy(
			this.#links.rows.filter((entry) => entry.group_id !== null),
			(entry) => entry.group_id!
		)
	);
	select(group: Group | null): void {
		this.#selectedId = group?.id ?? null;
	}

	open(group: Group): void {
		this.select(group);
		void goto('/groups');
	}

	membersOf(group: Group): GroupMember[] {
		return this.#membersByGroup.get(group.id) ?? [];
	}

	modsOf(group: Group): GroupMod[] {
		return this.membersOf(group).flatMap((member) => {
			const mod = this.#libraryStore.modById(member.mod_id);
			return mod ? [{ member, mod }] : [];
		});
	}

	memberCount(group: Group): number {
		return this.membersOf(group).length;
	}

	linkedProfiles(group: Group): Profile[] {
		const ids = (this.#linksByGroup.get(group.id) ?? []).map(
			(entry) => entry.profile_id
		);
		return this.#profilesStore.list.filter((profile) =>
			ids.includes(profile.id)
		);
	}

	groupsOf(mod: Mod): Group[] {
		return this.list.filter((group) =>
			this.membersOf(group).some((member) => member.mod_id === mod.id)
		);
	}

	isMember(group: Group, mod: Mod): boolean {
		return this.membersOf(group).some((member) => member.mod_id === mod.id);
	}

	isNameTaken(name: string, except?: Group): boolean {
		const wanted = name.trim().toLowerCase();
		return this.list.some(
			(group) => group !== except && group.name.toLowerCase() === wanted
		);
	}

	async create(
		name: string,
		mods: readonly Mod[] = [],
		options: {
			color?: string | null;
			steamCollectionId?: string | null;
		} = {}
	): Promise<Group> {
		const gameId = this.#gameId;
		const group = await Model.database.transaction(async (tx) => {
			const last = await Group.query()
				.where('game_id', gameId)
				.orderBy('position', 'desc')
				.first(tx);
			const created = await Group.create(
				{
					game_id: gameId,
					name: name.trim(),
					color: options.color ?? null,
					position: keyBetween(last?.position ?? null, null),
					steam_collection_id: options.steamCollectionId ?? null,
				},
				tx
			);
			await GroupsStore.appendMembers(created, mods, [], tx);
			return created;
		});
		this.#selectedId = group.id;
		return group;
	}

	async rename(group: Group, name: string): Promise<void> {
		await group.update({ name: name.trim() });
	}

	async recolor(group: Group, color: TagColor | null): Promise<void> {
		await group.update({ color });
	}

	async duplicate(group: Group): Promise<void> {
		let name = `${group.name} copy`;
		for (let number = 2; this.isNameTaken(name); number++)
			name = `${group.name} copy ${number}`;
		const mods = this.modsOf(group).map(({ mod }) => mod);
		await this.create(name, mods, {
			color: group.color,
		});
	}

	async delete(group: Group): Promise<void> {
		await group.delete();
		if (this.#selectedId === group.id) this.#selectedId = null;
	}

	async addMods(group: Group, mods: readonly Mod[]): Promise<void> {
		await Model.database.transaction((tx) =>
			GroupsStore.appendMembers(group, mods, this.membersOf(group), tx)
		);
	}

	async insertMods(
		group: Group,
		mods: readonly Mod[],
		index: number
	): Promise<void> {
		const members = this.membersOf(group);
		const present = members.map((member) => member.mod_id);
		const added = mods.filter((mod) => !present.includes(mod.id));
		if (!added.length) return;
		const at = Math.max(0, Math.min(index, members.length));
		const keys = keysBetween(
			members[at - 1]?.position ?? null,
			members[at]?.position ?? null,
			added.length
		);
		await GroupMember.createMany(
			added.map((mod, offset) => ({
				group_id: group.id,
				mod_id: mod.id,
				position: keys[offset],
			}))
		);
	}

	async removeMods(group: Group, mods: readonly Mod[]): Promise<void> {
		const ids = mods.map((mod) => mod.id);
		await GroupMember.deleteMany(
			this.membersOf(group).filter((member) =>
				ids.includes(member.mod_id)
			)
		);
	}

	async setMembership(
		group: Group,
		mods: readonly Mod[],
		isMember: boolean
	): Promise<void> {
		if (isMember) await this.addMods(group, mods);
		else await this.removeMods(group, mods);
	}

	async reorder(group: Group, modIds: readonly number[]): Promise<void> {
		const members = this.membersOf(group);
		const byMod = Object.fromEntries(
			members.map((member) => [member.mod_id, member])
		) as Record<number, GroupMember | undefined>;
		const ordered = modIds.flatMap((modId) => {
			const member = byMod[modId];
			return member ? [{ id: modId, key: member.position }] : [];
		});
		const changes = rekeyOrder(ordered);
		const moved = members.filter((member) => changes.has(member.mod_id));
		for (const member of moved)
			member.draft().position = changes.get(member.mod_id)!;
		await GroupMember.updateMany(moved);
	}

	private static async appendMembers(
		group: Group,
		mods: readonly Mod[],
		existing: readonly GroupMember[],
		tx: Transaction
	): Promise<void> {
		const present = existing.map((member) => member.mod_id);
		const added = mods.filter((mod) => !present.includes(mod.id));
		if (!added.length) return;
		const last = existing.at(-1)?.position ?? null;
		const keys = keysBetween(last, null, added.length);
		await GroupMember.createMany(
			added.map((mod, index) => ({
				group_id: group.id,
				mod_id: mod.id,
				position: keys[index],
			})),
			tx
		);
	}
}
