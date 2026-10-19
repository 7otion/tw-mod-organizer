import type { MessageKey } from '@/lib/i18n/message-key';
import type { CoverSize, LibraryColumn, LibrarySort } from '@/lib/store';

export type ColumnInfo = {
	labelKey: MessageKey;
	shortLabelKey?: MessageKey;
	sort?: LibrarySort;
	align?: 'center' | 'end';
	width?: 'fixed' | 'rest';
};

export const COLUMN_INFO: Record<LibraryColumn, ColumnInfo> = {
	source: {
		labelKey: 'library.columns.source',
		shortLabelKey: 'library.columns.sourceShort',
		sort: 'source',
		align: 'center',
		width: 'fixed',
	},
	mod: { labelKey: 'library.columns.mod', sort: 'title', width: 'rest' },
	author: { labelKey: 'library.columns.author', sort: 'author' },
	tags: { labelKey: 'library.columns.tags' },
	profiles: { labelKey: 'library.columns.profiles' },
	size: { labelKey: 'library.columns.size', sort: 'size', align: 'end' },
	updated: {
		labelKey: 'library.columns.updated',
		sort: 'updated',
		align: 'end',
	},
	added: { labelKey: 'library.columns.added', sort: 'added', align: 'end' },
	version: { labelKey: 'library.columns.version' },
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
