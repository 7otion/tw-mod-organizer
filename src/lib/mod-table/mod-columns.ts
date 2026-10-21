import type { MessageKey } from '@/lib/i18n/message-key';

export const COVER_SIZES = [
	'none',
	'compact',
	'regular',
	'large',
	'huge',
] as const;
export type CoverSize = (typeof COVER_SIZES)[number];

export const MOD_COLUMNS = [
	'source',
	'mod',
	'author',
	'tags',
	'profiles',
	'size',
	'updated',
	'added',
	'version',
] as const;
export type ModColumn = (typeof MOD_COLUMNS)[number];

export const MOD_SORTS = [
	'title',
	'author',
	'source',
	'size',
	'updated',
	'added',
] as const;
export type ModSort = (typeof MOD_SORTS)[number];

export type ColumnSpec<Sort extends string = string> = {
	labelKey: MessageKey;
	shortLabelKey?: MessageKey;
	sort?: Sort;
	align?: 'center' | 'end';
	width?: 'fixed' | 'rest';
};

export const MOD_COLUMN_SPECS: Record<ModColumn, ColumnSpec<ModSort>> = {
	source: {
		labelKey: 'modTable.columns.source',
		shortLabelKey: 'modTable.columns.sourceShort',
		sort: 'source',
		align: 'center',
		width: 'fixed',
	},
	mod: { labelKey: 'modTable.columns.mod', sort: 'title', width: 'rest' },
	author: { labelKey: 'modTable.columns.author', sort: 'author' },
	tags: { labelKey: 'modTable.columns.tags' },
	profiles: { labelKey: 'modTable.columns.profiles' },
	size: { labelKey: 'modTable.columns.size', sort: 'size', align: 'end' },
	updated: {
		labelKey: 'modTable.columns.updated',
		sort: 'updated',
		align: 'end',
	},
	added: { labelKey: 'modTable.columns.added', sort: 'added', align: 'end' },
	version: { labelKey: 'modTable.columns.version', align: 'center' },
};

export const DIVIDER_GAP = 4;

export const ROW_HEIGHTS: Record<CoverSize, number> = {
	none: 32,
	compact: 38,
	regular: 56,
	large: 72,
	huge: 108,
};

export const SOURCE_ICON_SIZES: Record<CoverSize, number> = {
	none: 16,
	compact: 16,
	regular: 20,
	large: 24,
	huge: 32,
};
