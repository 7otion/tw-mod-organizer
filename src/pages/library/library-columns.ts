import type { CoverSize, LibraryColumn, LibrarySort } from '@/lib/store';

export type ColumnInfo = {
	label: string;
	shortLabel?: string;
	sort?: LibrarySort;
	align?: 'center' | 'end';
	width?: 'fixed' | 'rest';
};

export const COLUMN_INFO: Record<LibraryColumn, ColumnInfo> = {
	source: {
		label: 'Source',
		shortLabel: 'S',
		sort: 'source',
		align: 'center',
		width: 'fixed',
	},
	mod: { label: 'Mod', sort: 'title', width: 'rest' },
	author: { label: 'Author', sort: 'author' },
	tags: { label: 'Tags' },
	profiles: { label: 'In profiles' },
	size: { label: 'Size', sort: 'size', align: 'end' },
	updated: { label: 'Updated', sort: 'updated', align: 'end' },
	added: { label: 'Added', sort: 'added', align: 'end' },
	version: { label: 'Version' },
};

export const SOURCE_ICON_SIZES: Record<CoverSize, number> = {
	none: 16,
	compact: 16,
	regular: 20,
	large: 24,
	huge: 32,
};
