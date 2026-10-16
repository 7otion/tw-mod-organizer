import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { ProfileGroupDisabled } from './profile-group-disabled';

export class GroupMember extends Model<typeof GroupMember.schema> {
	static readonly schema = this.define({
		table: 'group_members',
		columns: {
			group_id: Column.integer().primary(),
			mod_id: Column.integer().primary(),
			position: Column.text(),
		},
	});

	static readonly events: ModelEvents<GroupMember> = {
		'delete:before': async (written, tx) => {
			for (const [member] of written) {
				await ProfileGroupDisabled.query()
					.where('group_id', member.group_id)
					.where('mod_id', member.mod_id)
					.delete(tx);
			}
		},
	};
}
