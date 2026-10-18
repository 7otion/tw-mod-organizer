import { ConnectionStore, Model, type Transaction } from '@7otion-tauri/orm';

import {
	Profile,
	ProfileEntry,
	ProfileGroupDisabled,
	Separator,
} from '@/lib/models';
import { GamesStore } from '@/lib/store';

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
		const game = this.#gamesStore.current;
		if (!game) return;
		const position = (this.list.at(-1)?.position ?? 0) + 1;
		const profile = await Model.database.transaction(async (tx) => {
			const created = await Profile.create(
				{ game_id: game.app_id, name: name.trim(), position },
				tx
			);
			if (copyOf) await this.copyContents(copyOf, created, tx);
			return created;
		});
		if (makeActive) await this.activate(profile);
	}

	async activate(profile: Profile): Promise<void> {
		await this.#gamesStore.current?.row?.update({
			active_profile_id: profile.id,
		});
		await profile.update({ last_used_at: Date.now() });
	}

	async rename(profile: Profile, name: string): Promise<void> {
		await profile.update({ name: name.trim() });
	}

	async reorder(ids: readonly number[]): Promise<void> {
		await Model.database.transaction(async (tx) => {
			for (const [index, id] of ids.entries()) {
				const profile = this.list.find((profile) => profile.id === id);
				if (profile && profile.position !== index + 1)
					await profile.update({ position: index + 1 }, tx);
			}
		});
	}

	async delete(profile: Profile): Promise<void> {
		if (profile === this.active)
			throw new Error("The active profile can't be deleted.");
		await profile.delete();
	}

	private async copyContents(
		from: Profile,
		to: Profile,
		tx: Transaction
	): Promise<void> {
		const entries = await ProfileEntry.query()
			.where('profile_id', from.id)
			.get(tx);
		for (const entry of entries) {
			let separatorId = entry.separator_id;
			if (separatorId !== null) {
				const separator = await Separator.findOrFail(separatorId, tx);
				const copy = await Separator.create(
					{
						title: separator.title,
						background_color: separator.background_color,
						text_color: separator.text_color,
					},
					tx
				);
				separatorId = copy.id;
			}
			await ProfileEntry.create(
				{
					profile_id: to.id,
					position: entry.position,
					enabled: entry.enabled,
					collapsed: entry.collapsed,
					mod_id: entry.mod_id,
					separator_id: separatorId,
					group_id: entry.group_id,
				},
				tx
			);
		}
		const disabled = await ProfileGroupDisabled.query()
			.where('profile_id', from.id)
			.get(tx);
		for (const row of disabled) {
			await ProfileGroupDisabled.create(
				{
					profile_id: to.id,
					group_id: row.group_id,
					mod_id: row.mod_id,
				},
				tx
			);
		}
	}
}
