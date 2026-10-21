import type { ModColumn } from '@/lib/mod-table/mod-columns';
import type { TableLayoutSpec } from '@/lib/store';

export const PICKER_LAYOUT: TableLayoutSpec<ModColumn> = {
	key: 'picker',
	columns: ['mod'],
	hiddenByDefault: [],
};
