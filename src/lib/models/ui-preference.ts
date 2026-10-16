import { Column, Model } from '@7otion-tauri/orm';

export class UiPreference extends Model<typeof UiPreference.schema> {
	static readonly schema = this.define({
		table: 'ui_preferences',
		columns: {
			key: Column.text().primary(),
			value: Column.text(),
		},
	});
}
