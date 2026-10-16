import { Column, Model } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

import type { ModSource } from './mod';
import { ENTRY_KINDS, type EntryKind } from './profile-entry';

export class LaunchEntry extends Model<typeof LaunchEntry.schema> {
	static readonly schema = this.define({
		table: 'launch_entries',
		columns: {
			id: Column.integer().primary().generated(),
			launch_id: Column.integer(),
			order_index: Column.integer(),
			kind: Column.text<EntryKind>(),
			enabled: Column.boolean(),
			mod_id: Column.integer().nullable(),
			mod_source: Column.text<ModSource>().nullable(),
			mod_ref: Column.text().nullable(),
			group_id: Column.integer().nullable(),
			group_index: Column.integer().nullable(),
			title: Column.text(),
			background_color: Column.text().nullable(),
			text_color: Column.text().nullable(),
		},
	});

	static readonly mutators = this.mutate({
		kind: oneOf(ENTRY_KINDS, 'launch entry kind'),
	});
}
