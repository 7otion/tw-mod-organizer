import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { type Hex, isHex } from '@/lib/color';

import { ModTag } from './mod-tag';

export const TAG_PRESETS = [
	'ash',
	'pink',
	'blood',
	'ember',
	'gold',
	'emerald',
	'teal',
	'sapphire',
	'amethyst',
] as const;
export type TagPreset = (typeof TAG_PRESETS)[number];
export type TagColor = TagPreset | Hex;

export function isTagPreset(value: string): value is TagPreset {
	return TAG_PRESETS.some((preset) => preset === value);
}

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
		color: (value) => {
			if (value === null || isTagPreset(value) || isHex(value))
				return value;
			throw new Error(`"${value}" is not a valid tag colour.`);
		},
	});

	static readonly events: ModelEvents<Tag> = {
		'delete:before': async (written, tx) => {
			const ids = written.map(([tag]) => tag.id);
			await ModTag.query().whereIn('tag_id', ids).delete(tx);
		},
	};
}
