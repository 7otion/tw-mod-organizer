import { Column, Model } from '@7otion-tauri/orm';

export class Separator extends Model<typeof Separator.schema> {
	static readonly schema = this.define({
		table: 'separators',
		columns: {
			id: Column.integer().primary().generated(),
			title: Column.text(),
			background_color: Column.text().nullable(),
			text_color: Column.text().nullable(),
		},
	});
}
