import { Column, Model } from '@7otion-tauri/orm';

export class UiColumn extends Model<typeof UiColumn.schema> {
	static readonly schema = this.define({
		table: 'ui_columns',
		columns: {
			table_key: Column.text().primary(),
			column_key: Column.text().primary(),
			visible: Column.boolean(),
			position: Column.text(),
			width: Column.integer().nullable(),
		},
	});
}
