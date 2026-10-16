import { Column, Model } from '@7otion-tauri/orm';

export class ModTag extends Model<typeof ModTag.schema> {
	static readonly schema = this.define({
		table: 'mod_tags',
		columns: {
			mod_id: Column.integer().primary(),
			tag_id: Column.integer().primary(),
		},
	});
}
