import { Column, Model } from '@7otion-tauri/orm';

export class ViewColumn extends Model<typeof ViewColumn.schema> {
	static readonly schema = this.define({
		table: 'view_columns',
		columns: {
			view: Column.text().primary(),
			column_key: Column.text().primary(),
			visible: Column.boolean(),
			position: Column.text(),
			width: Column.integer().nullable(),
		},
	});
}
