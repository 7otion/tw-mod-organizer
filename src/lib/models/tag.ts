import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

import { ModTag } from './mod-tag';

export const TAG_COLORS = [
	'ash',
	'pink',
	'blood',
	'ember',
	'gold',
	'emerald',
	'sapphire',
	'amethyst',
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

const isTagColor = oneOf(TAG_COLORS, 'tag colour');

export class Tag extends Model<typeof Tag.schema> {
	static readonly schema = this.define({
		table: 'tags',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			name: Column.text(),
			color: Column.text<TagColor>().nullable(),
		},
	});

	static readonly mutators = this.mutate({
		color: (value) => (value === null ? null : isTagColor(value)),
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
