import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';

import { t } from '@/lib/i18n';
import {
	Profile,
	ProfileEntry,
	ProfileGroupDisabled,
	Separator,
} from '@/lib/models';
import { GamesStore } from '@/lib/store';
import { unixNow } from '@/lib/utils';

export class ProfilesStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #profiles = this.query(() =>
		Profile.query()
			.where('game_id', this.#gamesStore.current?.app_id ?? 0)
			.orderBy('position')
	);

	readonly list = $derived(this.#profiles.rows);
	readonly active = $derived(
		this.list.find(
			(profile) =>
				profile.id === this.#gamesStore.current?.row?.active_profile_id
		) ?? null
	);

	isNameTaken(name: string, except?: Profile): boolean {
		const wanted = name.trim().toLowerCase();
		return this.list.some(
			(profile) =>
				profile !== except && profile.name.toLowerCase() === wanted
		);
	}

	async create(
		name: string,
		copyOf: Profile | null,
		makeActive: boolean
	): Promise<void> {
		const game = this.#gamesStore.current!;
		const profile = await Model.database.transaction(async (tx) => {
			const last = await Profile.query()
				.where('game_id', game.app_id)
				.orderBy('position', 'desc')
				.first(tx);
			const created = await Profile.create(
				{
					game_id: game.app_id,
					name: name.trim(),
					position: (last?.position ?? 0) + 1,
				},
				tx
			);
			if (copyOf) await this.copyContents(copyOf, created, tx);
			return created;
		});
		if (makeActive) await this.activate(profile);
	}

	async activate(profile: Profile): Promise<void> {
		await this.#gamesStore.current!.row!.update({
			active_profile_id: profile.id,
		});
		await profile.update({ last_used_at: unixNow() });
	}

	async rename(profile: Profile, name: string): Promise<void> {
		await profile.update({ name: name.trim() });
	}

	async reorder(ids: readonly number[]): Promise<void> {
		const moved = ids.flatMap((id, index) => {
			const profile = this.list.find((profile) => profile.id === id)!;
			if (profile.position === index + 1) return [];
			profile.draft().position = index + 1;
			return [profile];
		});
		await Profile.updateMany(moved);
	}

	async clone(profile: Profile): Promise<void> {
		let name = `${profile.name} copy`;
		for (let number = 2; this.isNameTaken(name); number++)
			name = `${profile.name} copy ${number}`;
		await this.create(name, profile, false);
	}

	async delete(profile: Profile): Promise<void> {
		await this.deleteMany([profile]);
	}

	async deleteMany(profiles: readonly Profile[]): Promise<void> {
		if (profiles.some((profile) => profile === this.active))
			throw new Error(t('profiles.deleteActiveError'));
		await Profile.deleteMany(profiles);
	}

	private async copyContents(
		from: Profile,
		to: Profile,
		tx: Transaction
	): Promise<void> {
		const entries = await ProfileEntry.query()
			.where('profile_id', from.id)
			.toArray(tx);
		const separatorIds = ProfileEntry.separatorIds(entries);
		const separators = separatorIds.length
			? await Separator.query().whereIn('id', separatorIds).toArray(tx)
			: [];
		const copies = await Separator.createMany(
			separators.map((separator) => ({
				title: separator.title,
				background_color: separator.background_color,
				text_color: separator.text_color,
			})),
			tx
		);
		const originalIds = separators.map((separator) => separator.id);
		await ProfileEntry.createMany(
			entries.map((entry) => ({
				profile_id: to.id,
				position: entry.position,
				enabled: entry.enabled,
				collapsed: entry.collapsed,
				mod_id: entry.mod_id,
				separator_id:
					entry.separator_id === null
						? null
						: copies[originalIds.indexOf(entry.separator_id)].id,
				group_id: entry.group_id,
			})),
			tx
		);
		const disabled = await ProfileGroupDisabled.query()
			.where('profile_id', from.id)
			.toArray(tx);
		await ProfileGroupDisabled.createMany(
			disabled.map((row) => ({
				profile_id: to.id,
				group_id: row.group_id,
				mod_id: row.mod_id,
			})),
			tx
		);
	}
}
