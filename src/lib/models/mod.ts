import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

import { Download } from './download';
import { GroupMember } from './group-member';
import { LaunchEntry } from './launch-entry';
import { ModRelation } from './mod-relation';
import { ModTag } from './mod-tag';
import { ProfileEntry } from './profile-entry';
import { ProfileGroupDisabled } from './profile-group-disabled';

export const MOD_SOURCES = ['steam', 'nexus', 'manual', 'base'] as const;
export type ModSource = (typeof MOD_SOURCES)[number];

export class Mod extends Model<typeof Mod.schema> {
	static readonly schema = this.define({
		table: 'mods',
		columns: {
			id: Column.integer().primary().generated(),
			game_id: Column.integer(),
			source: Column.text<ModSource>(),
			source_ref: Column.text(),
			module_id: Column.text().nullable(),
			title: Column.text(),
			custom_title: Column.text().nullable(),
			description: Column.text().nullable(),
			author_name: Column.text().nullable(),
			author_ref: Column.text().nullable(),
			version: Column.text().nullable(),
			page_url: Column.text().nullable(),
			preview_url: Column.text().nullable(),
			preview_file: Column.text().nullable(),
			custom_preview_file: Column.text().nullable(),
			folder: Column.text().nullable(),
			pack_file: Column.text().nullable(),
			problem: Column.text().nullable(),
			size_bytes: Column.integer().nullable(),
			published_at: Column.date('unix').nullable(),
			remote_updated_at: Column.date('unix').nullable(),
			installed_updated_at: Column.date('unix').nullable(),
			seen_updated_at: Column.date('unix').nullable(),
			nexus_mod_id: Column.integer().nullable(),
			nexus_file_id: Column.integer().nullable(),
			added_at: Column.date('unix'),
			missing_since: Column.date('unix').nullable(),
		},
	});

	static readonly mutators = this.mutate({
		source: oneOf(MOD_SOURCES, 'mod source'),
	});

	static readonly events: ModelEvents<Mod> = {
		'delete:before': async (written, tx) => {
			const ids = written.map(([mod]) => mod.id);
			await ModTag.query().whereIn('mod_id', ids).delete(tx);
			await GroupMember.query().whereIn('mod_id', ids).delete(tx);
			await ProfileGroupDisabled.query()
				.whereIn('mod_id', ids)
				.delete(tx);
			await ProfileEntry.query().whereIn('mod_id', ids).delete(tx);
			await ModRelation.query().whereIn('mod_id', ids).delete(tx);
			await LaunchEntry.query()
				.whereIn('mod_id', ids)
				.update({ mod_id: null }, tx);
			await Download.query()
				.whereIn('mod_id', ids)
				.update({ mod_id: null }, tx);
		},
	};
}
