import { Column, Model } from '@7otion-tauri/orm';

export type SaveMetadata = Readonly<Record<string, string | number>>;

export class Save extends Model<typeof Save.schema> {
	static readonly schema = this.define({
		table: 'saves',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			file_name: Column.text(),
			metadata: Column.json<SaveMetadata>().nullable(),
			size_bytes: Column.integer(),
			modified_at: Column.date('unix'),
			launch_id: Column.integer().nullable(),
		},
	});
}
