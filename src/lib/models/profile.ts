import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { Game } from './game';
import { Launch } from './launch';
import { ProfileEntry } from './profile-entry';
import { ProfileGroupDisabled } from './profile-group-disabled';

export class Profile extends Model<typeof Profile.schema> {
	static readonly schema = this.define({
		table: 'profiles',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			name: Column.text(),
			position: Column.integer(),
			created_at: Column.date('unix'),
			last_used_at: Column.date('unix').nullable(),
		},
	});

	static readonly events: ModelEvents<Profile> = {
		'delete:before': async (written, tx) => {
			const ids = written.map(([profile]) => profile.id);
			await ProfileEntry.query().whereIn('profile_id', ids).delete(tx);
			await ProfileGroupDisabled.query()
				.whereIn('profile_id', ids)
				.delete(tx);
			await Launch.query()
				.whereIn('profile_id', ids)
				.update({ profile_id: null }, tx);
			await Game.query()
				.whereIn('active_profile_id', ids)
				.update({ active_profile_id: null }, tx);
		},
	};
}
