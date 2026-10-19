import { Column, Model } from '@7otion-tauri/orm';

export class UiState extends Model<typeof UiState.schema> {
	static readonly schema = this.define({
		table: 'ui_state',
		columns: {
			key: Column.text().primary(),
			value: Column.text(),
		},
	});
}
