import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { GroupMember } from './group-member';
import { LaunchEntry } from './launch-entry';
import { ProfileEntry } from './profile-entry';
import { ProfileGroupDisabled } from './profile-group-disabled';

export class Group extends Model<typeof Group.schema> {
	static readonly schema = this.define({
		table: 'groups',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			name: Column.text(),
			color: Column.text().nullable(),
			position: Column.text(),
			steam_collection_id: Column.text().nullable(),
		},
	});

	static readonly events: ModelEvents<Group> = {
		'delete:before': async (written, tx) => {
			const ids = written.map(([group]) => group.id);
			await ProfileEntry.query().whereIn('group_id', ids).delete(tx);
			await ProfileGroupDisabled.query()
				.whereIn('group_id', ids)
				.delete(tx);
			await GroupMember.query().whereIn('group_id', ids).delete(tx);
			await LaunchEntry.query()
				.whereIn('group_id', ids)
				.update({ group_id: null }, tx);
		},
	};
}
