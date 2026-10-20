import { MOD_COLUMNS, type ModColumn } from '@/lib/mod-table/mod-columns';
import type { TableLayoutSpec } from '@/lib/store';

export const LIBRARY_LAYOUT: TableLayoutSpec<ModColumn> = {
	key: 'library',
	columns: MOD_COLUMNS,
	hiddenByDefault: ['added', 'version'],
};
