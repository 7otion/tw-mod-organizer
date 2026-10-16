import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { ModTag } from './mod-tag';

export class Tag extends Model<typeof Tag.schema> {
	static readonly schema = this.define({
		table: 'tags',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			name: Column.text(),
			color: Column.text().nullable(),
		},
	});

	static readonly events: ModelEvents<Tag> = {
		'delete:before': async (written, tx) => {
			await ModTag.query()
				.whereIn(
					'tag_id',
					written.map(([tag]) => tag.id)
				)
				.delete(tx);
		},
	};
}
