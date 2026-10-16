import { Column, Model, type ModelEvents } from '@7otion-tauri/orm';

import { ProfileGroupDisabled } from './profile-group-disabled';
import { Separator } from './separator';

export const ENTRY_KINDS = ['mod', 'separator', 'group'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export class ProfileEntry extends Model<typeof ProfileEntry.schema> {
	static readonly schema = this.define({
		table: 'profile_entries',
		columns: {
			id: Column.integer().primary().generated(),
			profile_id: Column.integer(),
			position: Column.text(),
			enabled: Column.boolean(),
			collapsed: Column.boolean(),
			mod_id: Column.integer().nullable(),
			separator_id: Column.integer().nullable(),
			group_id: Column.integer().nullable(),
		},
	});

	static readonly events: ModelEvents<ProfileEntry> = {
		'save:before': async (written) => {
			for (const [entry] of written) {
				const { mod_id, separator_id, group_id } = entry.draft();
				const targets = [mod_id, separator_id, group_id].filter(
					(id) => id !== null
				);
				if (targets.length !== 1)
					throw new Error(
						'A profile entry must point at exactly one mod, separator or group.'
					);
			}
		},
		'delete:before': async (written, tx) => {
			for (const [entry] of written) {
				if (entry.group_id === null) continue;
				await ProfileGroupDisabled.query()
					.where('profile_id', entry.profile_id)
					.where('group_id', entry.group_id)
					.delete(tx);
			}
		},
		'delete:after': async (written, tx) => {
			const separatorIds = written.flatMap(([entry]) =>
				entry.separator_id === null ? [] : [entry.separator_id]
			);
			if (!separatorIds.length) return;
			await Separator.query().whereIn('id', separatorIds).delete(tx);
		},
	};

	get kind(): EntryKind {
		if (this.mod_id !== null) return 'mod';
		if (this.separator_id !== null) return 'separator';
		return 'group';
	}
}
