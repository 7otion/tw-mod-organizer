import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { LaunchEntry } from './launch-entry';
import { Save } from './save';

export class Launch extends Model<typeof Launch.schema> {
	static readonly schema = this.define({
		table: 'launches',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			profile_id: Column.integer().nullable(),
			profile_name: Column.text().nullable(),
			started_at: Column.date('unix'),
			ended_at: Column.date('unix').nullable(),
			loaded_save: Column.text().nullable(),
		},
	});

	static readonly events: ModelEvents<Launch> = {
		'delete:before': async (written, tx) => {
			const ids = written.map(([launch]) => launch.id);
			await LaunchEntry.query().whereIn('launch_id', ids).delete(tx);
			await Save.query()
				.whereIn('launch_id', ids)
				.update({ launch_id: null }, tx);
		},
	};
}
