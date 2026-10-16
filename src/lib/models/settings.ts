import { Column, Model } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

export const NEW_MODS_PLACEMENTS = ['end_of_list', 'selected_section'] as const;
export type NewModsPlacement = (typeof NEW_MODS_PLACEMENTS)[number];

export class Settings extends Model<typeof Settings.schema> {
	static readonly schema = this.define({
		table: 'settings',
		columns: {
			id: Column.integer().primary(),
			mods_dir: Column.text(),
			downloads_dir: Column.text(),
			rpfm_path: Column.text().nullable(),
			confirm_dependency_changes: Column.boolean(),
			preview_auto_sort: Column.boolean(),
			new_mods_placement: Column.text<NewModsPlacement>(),
			v1_import_offered_at: Column.date('unix').nullable(),
		},
	});

	static readonly mutators = this.mutate({
		new_mods_placement: oneOf(
			NEW_MODS_PLACEMENTS,
			'placement for new mods'
		),
	});
}
