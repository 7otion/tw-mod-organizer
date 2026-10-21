import type { ModColumn } from '@/lib/mod-table/mod-columns';
import type { TableLayoutSpec } from '@/lib/store';

export const GROUPS_LAYOUT: TableLayoutSpec<ModColumn> = {
	key: 'groups',
	columns: [
		'source',
		'mod',
		'author',
		'tags',
		'size',
		'version',
		'profiles',
		'updated',
		'added',
	],
	hiddenByDefault: ['profiles', 'updated', 'added'],
};
