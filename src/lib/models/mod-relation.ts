import { Column, Model } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

export const RELATION_KINDS = ['requires', 'load_before'] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

export const RELATION_TARGET_SOURCES = ['steam', 'module'] as const;
export type RelationTargetSource = (typeof RELATION_TARGET_SOURCES)[number];

export const RELATION_ORIGINS = ['steam', 'submodule'] as const;
export type RelationOrigin = (typeof RELATION_ORIGINS)[number];

export class ModRelation extends Model<typeof ModRelation.schema> {
	static readonly schema = this.define({
		table: 'mod_relations',
		columns: {
			id: Column.integer().primary().generated(),
			mod_id: Column.integer(),
			kind: Column.text<RelationKind>(),
			target_source: Column.text<RelationTargetSource>(),
			target_ref: Column.text(),
			target_title: Column.text().nullable(),
			optional: Column.boolean(),
			origin: Column.text<RelationOrigin>(),
		},
	});

	static readonly mutators = this.mutate({
		kind: oneOf(RELATION_KINDS, 'relation kind'),
		target_source: oneOf(RELATION_TARGET_SOURCES, 'relation target source'),
		origin: oneOf(RELATION_ORIGINS, 'relation origin'),
	});
}
