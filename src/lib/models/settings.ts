import { Column, Model } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

export const DATE_FORMATS = [
	'system',
	'yyyy-MM-dd',
	'yyyy/MM/dd',
	'dd.MM.yyyy',
	'dd/MM/yyyy',
	'MM/dd/yyyy',
	'd MMM yyyy',
] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export class Settings extends Model<typeof Settings.schema> {
	static readonly schema = this.define({
		table: 'settings',
		columns: {
			id: Column.integer().primary(),
			mods_dir: Column.text(),
			downloads_dir: Column.text(),
			rpfm_path: Column.text().nullable(),
			nexus_api_key: Column.text().nullable(),
			nexus_user_name: Column.text().nullable(),
			preview_auto_sort: Column.boolean(),
			date_format: Column.text<DateFormat>(),
			language: Column.text(),
			v1_import_offered_at: Column.date('unix').nullable(),
			current_game_id: Column.integer().nullable(),
		},
	});

	static readonly mutators = this.mutate({
		date_format: oneOf(DATE_FORMATS, 'date format'),
	});
}
