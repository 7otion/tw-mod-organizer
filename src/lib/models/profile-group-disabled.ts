import { Column, Model } from '@7otion-tauri/orm';

export class ProfileGroupDisabled extends Model<
	typeof ProfileGroupDisabled.schema
> {
	static readonly schema = this.define({
		table: 'profile_group_disabled',
		columns: {
			profile_id: Column.integer().primary(),
			group_id: Column.integer().primary(),
			mod_id: Column.integer().primary(),
		},
	});
}
