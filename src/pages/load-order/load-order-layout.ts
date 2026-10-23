import type { ModColumn } from '@/lib/mod-table/mod-columns';
import type { TableLayoutSpec } from '@/lib/store';

export const LOAD_ORDER_LAYOUT: TableLayoutSpec<ModColumn> = {
	key: 'load_order',
	columns: [
		'source',
		'mod',
		'tags',
		'author',
		'size',
		'version',
		'updated',
		'added',
		'profiles',
	],
	hiddenByDefault: ['author', 'size', 'version', 'added', 'profiles'],
};
