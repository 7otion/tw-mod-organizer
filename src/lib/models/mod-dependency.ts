import { Column, Model } from '@7otion-tauri/orm';

import { oneOf } from '@/lib/utils';

export const DEPENDENCY_ORIGINS = ['steam', 'game'] as const;
export type DependencyOrigin = (typeof DEPENDENCY_ORIGINS)[number];

export class ModDependency extends Model<typeof ModDependency.schema> {
	static readonly schema = this.define({
		table: 'mod_dependencies',
		columns: {
			id: Column.integer().primary().generated(),
			mod_id: Column.integer(),
			required_ref: Column.text(),
			required_title: Column.text().nullable(),
			optional: Column.boolean(),
			origin: Column.text<DependencyOrigin>(),
		},
	});

	static readonly mutators = this.mutate({
		origin: oneOf(DEPENDENCY_ORIGINS, 'dependency origin'),
	});
}
