import { Column, Model } from '@7otion-tauri/orm';

export class Game extends Model<typeof Game.schema> {
	static readonly schema = this.define({
		table: 'games',
		columns: {
			app_id: Column.integer().primary(),
			active_profile_id: Column.integer().nullable(),
			install_path: Column.text().nullable(),
			pin_position: Column.integer().nullable(),
			last_opened_at: Column.date('unix').nullable(),
			scanned_at: Column.date('unix').nullable(),
			steam_synced_at: Column.date('unix').nullable(),
			created_at: Column.date('unix'),
		},
	});
}
