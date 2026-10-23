import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';
import { tick } from 'svelte';

import type { EnableBoxState } from '@/lib/mod-table/enable-box.svelte';

import {
	ProfileEntry,
	ProfileGroupDisabled,
	Separator,
	type Group,
	type GroupMember,
	type Mod,
	type Profile,
	type TagColor,
} from '@/lib/models';
import { keyBetween, keysBetween, rekeyOrder } from '@/lib/position';
import { GroupsStore, LibraryStore, ProfilesStore } from '@/lib/store';

type RowBase = {
	key: number;
	entry: ProfileEntry;
};

export type ModRow = RowBase & {
	kind: 'mod';
	mod: Mod;
	number: number;
	isEnabled: boolean;
	group: Group | null;
	member: GroupMember | null;
	isLastMember: boolean;
};

export type SeparatorRow = RowBase & {
	kind: 'separator';
	separator: Separator;
	mods: ModRow[];
	enabledCount: number;
};

export type GroupRow = RowBase & {
	kind: 'group';
	group: Group;
	members: ModRow[];
	enabledCount: number;
};

export type LoadOrderRow = ModRow | SeparatorRow | GroupRow;

export type MoveTarget = {
	kind: 'group' | 'block' | 'entry';
	group: Group | null;
	profile: Profile;
};

export type ScrollTarget = {
	scrollToKey(key: number): void;
};

type EntryTarget = {
	mod_id?: number;
	separator_id?: number;
	group_id?: number;
};

type Unit = {
	entry: ProfileEntry;
	rows: LoadOrderRow[];
	section: SeparatorRow | null;
};

const MEMBER_KEY_SPAN = 1 << 26;

export class LoadOrderStore extends ConnectionStore {
	readonly #libraryStore = LibraryStore.get();
	readonly #profilesStore = ProfilesStore.get();
	readonly #groupsStore = GroupsStore.get();
	readonly #disabled = this.query(() =>
		ProfileGroupDisabled.query().where(
			'profile_id',
			this.#profilesStore.active?.id ?? 0
		)
	);
	readonly #separators = this.query(() =>
		Separator.query().whereIn('id', ProfileEntry.separatorIds(this.entries))
	);

	isPicking = $state(false);
	isCreatingSeparator = $state(false);
	table: ScrollTarget | null = null;

	readonly profile = $derived(this.#profilesStore.active);
	readonly entries = $derived(
		this.profile ? this.#libraryStore.entriesOf(this.profile) : []
	);
	readonly #units = $derived.by((): Unit[] => {
		const separators = Object.fromEntries(
			this.#separators.rows.map((separator) => [separator.id, separator])
		) as Record<number, Separator>;
		const groups = Object.fromEntries(
			this.#groupsStore.list.map((group) => [group.id, group])
		) as Record<number, Group>;
		const disabled = Object.fromEntries(
			this.#disabled.rows.map((row) => [
				`${row.group_id}:${row.mod_id}`,
				true,
			])
		) as Record<string, true>;
		const units: Unit[] = [];
		let section: SeparatorRow | null = null;
		let number = 0;
		for (const entry of this.entries) {
			if (entry.separator_id !== null) {
				const separator = separators[entry.separator_id];
				if (!separator) continue;
				section = {
					kind: 'separator',
					key: entry.id,
					entry,
					separator,
					mods: [],
					enabledCount: 0,
				};
				units.push({ entry, rows: [section], section: null });
			} else if (entry.mod_id !== null) {
				const mod = this.#libraryStore.modById(entry.mod_id);
				if (!mod) continue;
				const row: ModRow = {
					kind: 'mod',
					key: entry.id,
					entry,
					mod,
					number: ++number,
					isEnabled: entry.enabled,
					group: null,
					member: null,
					isLastMember: false,
				};
				LoadOrderStore.count(section, [row]);
				units.push({ entry, rows: [row], section });
			} else if (entry.group_id !== null) {
				const group = groups[entry.group_id];
				if (!group) continue;
				const modsOf = this.#groupsStore.modsOf(group);
				const members = modsOf.map(
					({ member, mod }, index): ModRow => ({
						kind: 'mod',
						key: LoadOrderStore.memberKey(entry, mod),
						entry,
						mod,
						number: ++number,
						isEnabled:
							entry.enabled &&
							!(`${group.id}:${mod.id}` in disabled),
						group,
						member,
						isLastMember: index === modsOf.length - 1,
					})
				);
				const row: GroupRow = {
					kind: 'group',
					key: entry.id,
					entry,
					group,
					members,
					enabledCount: 0,
				};
				LoadOrderStore.count(row, members);
				LoadOrderStore.count(section, members);
				units.push({
					entry,
					rows: entry.collapsed ? [row] : [row, ...members],
					section,
				});
			}
		}
		return units;
	});

	readonly rows = $derived.by((): LoadOrderRow[] =>
		this.#units.flatMap((unit) =>
			unit.section?.entry.collapsed ? [] : unit.rows
		)
	);
	readonly modRows = $derived.by((): ModRow[] =>
		this.#units.flatMap((unit) =>
			unit.rows.flatMap((row) => {
				if (row.kind === 'mod') return [row];
				if (row.kind === 'group') return row.members;
				return [];
			})
		)
	);
	readonly enableRows = $derived.by((): LoadOrderRow[] =>
		this.#units.flatMap((unit) => {
			const [head] = unit.rows;
			if (head.kind === 'separator') return [];
			if (head.kind === 'group') return [head, ...head.members];
			return [head];
		})
	);
	readonly #rowsByKey = $derived(
		Object.fromEntries(
			this.#units.flatMap((unit) =>
				unit.rows.flatMap((row) => {
					const rows: [number, LoadOrderRow][] = [[row.key, row]];
					if (row.kind === 'group')
						for (const member of row.members)
							rows.push([member.key, member]);
					return rows;
				})
			)
		) as Record<number, LoadOrderRow>
	);
	readonly #hiddenBySection = $derived.by(() => {
		const hidden: Record<number, ProfileEntry[]> = {};
		for (const unit of this.#units)
			if (unit.section?.entry.collapsed)
				(hidden[unit.section.entry.id] ??= []).push(unit.entry);
		return hidden;
	});
	readonly slotsByModId = $derived.by(() => {
		const slots: Record<number, ModRow> = {};
		for (const row of this.modRows) {
			const known = slots[row.mod.id];
			if (!known || (!known.isEnabled && row.isEnabled))
				slots[row.mod.id] = row;
		}
		return slots;
	});
	readonly modIds = $derived(this.modRows.map((row) => row.mod.id));
	readonly enabledCount = $derived(
		this.modRows.filter((row) => row.isEnabled).length
	);
	readonly outline = $derived.by((): (SeparatorRow | GroupRow)[] =>
		this.#units.flatMap((unit) => {
			const [head] = unit.rows;
			return head.kind === 'mod' ? [] : [head];
		})
	);
	readonly linkedGroupIds = $derived(ProfileEntry.groupIds(this.entries));
	readonly unlinkedGroups = $derived(
		this.#groupsStore.list.filter(
			(group) => !this.linkedGroupIds.includes(group.id)
		)
	);

	rowByKey(key: number): LoadOrderRow | null {
		return this.#rowsByKey[key] ?? null;
	}

	unitOf(key: number): readonly number[] | null {
		const row = this.rowByKey(key);
		if (!row) return null;
		if (row.kind === 'mod') return row.member ? null : [key];
		if (row.kind === 'separator') return [key];
		return row.entry.collapsed
			? [key]
			: [key, ...row.members.map((member) => member.key)];
	}

	isSeparatorTitleTaken(title: string, except?: Separator): boolean {
		const wanted = title.trim().toLowerCase();
		return this.outline.some(
			(row) =>
				row.kind === 'separator' &&
				row.separator !== except &&
				row.separator.title.toLowerCase() === wanted
		);
	}

	async reveal(key: number): Promise<boolean> {
		const row = this.rowByKey(key);
		if (!row) return false;
		const unit = this.#units.find((unit) => unit.entry === row.entry);
		if (!unit) return false;
		const bands: (SeparatorRow | GroupRow)[] = [];
		if (unit.section?.entry.collapsed) bands.push(unit.section);
		const [head] = unit.rows;
		if (head.kind === 'group' && head.entry.collapsed && row !== head)
			bands.push(head);
		for (const band of bands) await this.setCollapsed(band, false);
		return true;
	}

	async revealMod(modId: number): Promise<boolean> {
		const row = this.slotsByModId[modId];
		return row ? this.reveal(row.key) : false;
	}

	async scrollTo(row: LoadOrderRow): Promise<void> {
		await this.reveal(row.key);
		await tick();
		this.table?.scrollToKey(row.key);
	}

	async reorder(keys: readonly number[]): Promise<void> {
		const hidden = this.#hiddenBySection;
		const ordered = keys.flatMap((key) => {
			const row = this.rowByKey(key);
			if (!row || (row.kind === 'mod' && row.member)) return [];
			return [row.entry, ...(hidden[row.entry.id] ?? [])];
		});
		const changes = rekeyOrder(
			ordered.map((entry) => ({ id: entry.id, key: entry.position }))
		);
		const moved = ordered.filter((entry) => changes.has(entry.id));
		for (const entry of moved)
			entry.draft().position = changes.get(entry.id)!;
		await ProfileEntry.updateMany(moved);
	}

	enableStateOf(row: LoadOrderRow): EnableBoxState | null {
		if (row.kind === 'mod') return row.isEnabled;
		const total =
			row.kind === 'group' ? row.members.length : row.mods.length;
		if (!total) return null;
		if (row.enabledCount === 0) return false;
		return row.enabledCount === total ? true : 'mixed';
	}

	async setEnabled(
		rows: readonly LoadOrderRow[],
		isEnabled: boolean
	): Promise<void> {
		const profile = this.profile!;
		const entries: ProfileEntry[] = [];
		const switchedOn: ProfileGroupDisabled[] = [];
		const switchedOff: { group_id: number; mod_id: number }[] = [];
		const disabled = this.#disabled.rows;
		const disabledRow = (groupId: number, modId: number) =>
			disabled.find(
				(item) => item.group_id === groupId && item.mod_id === modId
			) ?? null;
		const switchOn = (groupId: number, modId: number) => {
			const known = disabledRow(groupId, modId);
			if (known && !switchedOn.includes(known)) switchedOn.push(known);
		};
		const switchOff = (groupId: number, modId: number) => {
			if (
				!disabledRow(groupId, modId) &&
				!switchedOff.some(
					(item) => item.group_id === groupId && item.mod_id === modId
				)
			)
				switchedOff.push({ group_id: groupId, mod_id: modId });
		};
		const setEntry = (entry: ProfileEntry, enabled: boolean) => {
			if (entry.enabled === enabled || entries.includes(entry)) return;
			entry.draft().enabled = enabled;
			entries.push(entry);
		};
		const askedByBlock: Record<number, ModRow[]> = {};
		const mods = rows.flatMap((row) => {
			if (row.kind === 'separator') return row.mods;
			if (row.kind === 'group') return row.members;
			return [row];
		});
		for (const row of mods) {
			if (row.member) (askedByBlock[row.entry.id] ??= []).push(row);
			else setEntry(row.entry, isEnabled);
		}
		for (const asked of Object.values(askedByBlock)) {
			const { entry, group } = asked[0];
			const block = this.rowByKey(entry.id);
			const members = block?.kind === 'group' ? block.members : asked;
			const isWhole = asked.length === members.length;
			if (!isEnabled) {
				if (isWhole) setEntry(entry, false);
				else for (const row of asked) switchOff(group!.id, row.mod.id);
				continue;
			}
			for (const row of asked) switchOn(group!.id, row.mod.id);
			if (entry.enabled) continue;
			setEntry(entry, true);
			if (isWhole) continue;
			const askedIds = asked.map((row) => row.mod.id);
			for (const member of members)
				if (!askedIds.includes(member.mod.id))
					switchOff(group!.id, member.mod.id);
		}
		await Model.database.transaction(async (tx) => {
			await ProfileEntry.updateMany(entries, tx);
			await ProfileGroupDisabled.deleteMany(switchedOn, tx);
			await ProfileGroupDisabled.createMany(
				switchedOff.map((item) => ({
					profile_id: profile.id,
					...item,
				})),
				tx
			);
		});
	}

	async remove(rows: readonly LoadOrderRow[]): Promise<void> {
		const entries = rows.flatMap((row) =>
			row.kind === 'mod' && row.member ? [] : [row.entry]
		);
		await ProfileEntry.deleteMany(entries);
	}

	async setCollapsed(
		row: SeparatorRow | GroupRow,
		isCollapsed: boolean
	): Promise<void> {
		await row.entry.update({ collapsed: isCollapsed });
	}

	async collapseAll(): Promise<void> {
		const entries = this.outline
			.filter((row) => !row.entry.collapsed)
			.map((row) => row.entry);
		for (const entry of entries) entry.draft().collapsed = true;
		await ProfileEntry.updateMany(entries);
	}

	async insertMods(
		mods: readonly Mod[],
		index: number
	): Promise<readonly number[]> {
		const present = this.slotsByModId;
		const added = mods.filter((mod) => !(mod.id in present));
		if (!added.length) return [];
		const [before, after] = this.neighboursAt(index);
		const keys = keysBetween(
			before?.position ?? null,
			after?.position ?? null,
			added.length
		);
		const created = await ProfileEntry.createMany(
			added.map((mod, offset) =>
				this.entryFor(keys[offset], { mod_id: mod.id }, true)
			)
		);
		return created.map((entry) => entry.id);
	}

	async appendMods(
		profileId: number,
		mods: readonly Mod[],
		tx?: Transaction
	): Promise<void> {
		if (!mods.length) return;
		const last = await ProfileEntry.query()
			.where('profile_id', profileId)
			.orderBy('position', 'desc')
			.first(tx);
		const keys = keysBetween(last?.position ?? null, null, mods.length);
		await ProfileEntry.createMany(
			mods.map((mod, offset) =>
				LoadOrderStore.entryOf(
					profileId,
					keys[offset],
					{ mod_id: mod.id },
					false
				)
			),
			tx
		);
	}

	async setMembership(
		profile: Profile,
		mods: readonly Mod[],
		isMember: boolean
	): Promise<void> {
		if (isMember) {
			await this.appendMods(
				profile.id,
				mods.filter(
					(mod) => !this.#libraryStore.isInProfile(mod, profile)
				)
			);
			return;
		}
		const modIds = mods.map((mod) => mod.id);
		await ProfileEntry.deleteMany(
			this.#libraryStore
				.entriesOf(profile)
				.filter(
					(entry) =>
						entry.mod_id !== null && modIds.includes(entry.mod_id)
				)
		);
	}

	async moveToSeparator(
		rows: readonly LoadOrderRow[],
		separator: SeparatorRow | null
	): Promise<void> {
		await this.moveUnits(rows, (rest) => {
			if (!separator) return 0;
			let at = rest.findIndex((row) => row.key === separator.key);
			if (at < 0) return rest.length;
			while (at + 1 < rest.length && rest[at + 1].kind !== 'separator')
				at++;
			return at + 1;
		});
	}

	async moveToPriority(
		rows: readonly LoadOrderRow[],
		number: number
	): Promise<void> {
		await this.moveUnits(rows, (rest) => {
			let counted = 0;
			for (const [index, row] of rest.entries()) {
				if (counted >= number - 1) return index;
				counted += LoadOrderStore.modCountOf(row);
			}
			return rest.length;
		});
	}

	async linkGroup(group: Group): Promise<void> {
		await ProfileEntry.create(
			this.entryFor(this.tailPosition(), { group_id: group.id }, true)
		);
	}

	async updateSeparator(
		separator: Separator,
		title: string,
		color: TagColor
	): Promise<void> {
		await separator.update({
			title: title.trim(),
			background_color: color,
		});
	}

	async createSeparator(title: string, color: TagColor): Promise<void> {
		const position = this.tailPosition();
		await Model.database.transaction(async (tx) => {
			const separator = await Separator.create(
				{
					title: title.trim(),
					background_color: color,
					text_color: null,
				},
				tx
			);
			await ProfileEntry.create(
				this.entryFor(position, { separator_id: separator.id }, true),
				tx
			);
		});
	}

	moveOf(mod: Mod, requirement: Mod): MoveTarget | null {
		const moved = this.slotsByModId[mod.id];
		const target = this.slotsByModId[requirement.id];
		const profile = this.profile;
		if (!moved || !target || !profile) return null;
		if (moved.group && moved.group === target.group)
			return { kind: 'group', group: moved.group, profile };
		if (moved.group) return { kind: 'block', group: moved.group, profile };
		return { kind: 'entry', group: null, profile };
	}

	async moveAfter(mod: Mod, requirement: Mod): Promise<void> {
		const moved = this.slotsByModId[mod.id];
		const target = this.slotsByModId[requirement.id];
		if (!moved || !target) return;
		if (moved.group && moved.group === target.group) {
			const ids = this.#groupsStore
				.modsOf(moved.group)
				.map((item) => item.mod.id)
				.filter((id) => id !== moved.mod.id);
			ids.splice(ids.indexOf(target.mod.id) + 1, 0, moved.mod.id);
			await this.#groupsStore.reorder(moved.group, ids);
			return;
		}
		if (moved.entry === target.entry) return;
		const entries = this.entries.filter((entry) => entry !== moved.entry);
		const next = entries[entries.indexOf(target.entry) + 1];
		await moved.entry.update({
			position: keyBetween(target.entry.position, next?.position ?? null),
		});
	}

	private async moveUnits(
		rows: readonly LoadOrderRow[],
		indexIn: (rest: readonly LoadOrderRow[]) => number
	): Promise<void> {
		const moved: Record<number, true> = {};
		const movedKeys: number[] = [];
		for (const row of rows) {
			const head =
				row.kind === 'mod' && row.member ? row.entry.id : row.key;
			for (const key of this.unitOf(head) ?? [])
				if (!(key in moved)) {
					moved[key] = true;
					movedKeys.push(key);
				}
		}
		if (!movedKeys.length) return;
		const rest = this.rows.filter((row) => !(row.key in moved));
		const at = indexIn(rest);
		const keys = rest.map((row) => row.key);
		await this.reorder([
			...keys.slice(0, at),
			...movedKeys,
			...keys.slice(at),
		]);
	}

	private entryFor(
		position: string,
		target: EntryTarget,
		isEnabled: boolean
	) {
		return LoadOrderStore.entryOf(
			this.profile!.id,
			position,
			target,
			isEnabled
		);
	}

	private tailPosition(): string {
		return keyBetween(this.entries.at(-1)?.position ?? null, null);
	}

	private neighboursAt(
		index: number
	): [ProfileEntry | null, ProfileEntry | null] {
		const rows = this.rows;
		const entries = this.entries;
		if (index >= rows.length) return [entries.at(-1) ?? null, null];
		const row = rows[index];
		const at = entries.indexOf(row.entry);
		if (row.kind === 'mod' && row.member) {
			const block = this.rowByKey(row.entry.id);
			const isFirst = block?.kind === 'group' && block.members[0] === row;
			if (!isFirst) return [row.entry, entries[at + 1] ?? null];
		}
		return [entries[at - 1] ?? null, row.entry];
	}

	private static modCountOf(row: LoadOrderRow): number {
		if (row.kind === 'mod') return 1;
		if (row.kind === 'group')
			return row.entry.collapsed ? row.members.length : 0;
		return row.entry.collapsed ? row.mods.length : 0;
	}

	private static count(
		band: SeparatorRow | GroupRow | null,
		rows: readonly ModRow[]
	): void {
		if (!band) return;
		if (band.kind === 'separator') band.mods.push(...rows);
		band.enabledCount += rows.filter((row) => row.isEnabled).length;
	}

	private static entryOf(
		profileId: number,
		position: string,
		target: EntryTarget,
		isEnabled: boolean
	) {
		return {
			profile_id: profileId,
			position,
			enabled: isEnabled,
			collapsed: false,
			mod_id: target.mod_id ?? null,
			separator_id: target.separator_id ?? null,
			group_id: target.group_id ?? null,
		};
	}

	private static memberKey(entry: ProfileEntry, mod: Mod): number {
		return -(entry.id * MEMBER_KEY_SPAN + mod.id);
	}
}
