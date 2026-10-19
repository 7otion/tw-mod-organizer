import { ConnectionStore, Model } from '@7otion-tauri/orm';

import { UiColumn } from '@/lib/models';
import { UiStateStore, type UiStateField } from '@/lib/store';

export const LIBRARY_COLUMNS = [
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
export type LibraryColumn = (typeof LIBRARY_COLUMNS)[number];

export const COVER_SIZES = [
	'none',
	'compact',
	'regular',
	'large',
	'huge',
] as const;
export type CoverSize = (typeof COVER_SIZES)[number];

export type LibraryColumnState = {
	key: LibraryColumn;
	isVisible: boolean;
	width: number | null;
};

const TABLE_KEY = 'library';
const HIDDEN_BY_DEFAULT: readonly LibraryColumn[] = ['added', 'version'];

export class LibraryColumnsStore extends ConnectionStore {
	private static readonly coverSizeField: UiStateField<CoverSize> = {
		key: 'library.cover_size',
		initial: 'compact',
		is: (value): value is CoverSize =>
			COVER_SIZES.some((size) => size === value),
	};

	readonly #uiStateStore = UiStateStore.get();
	readonly #rows = this.query(() =>
		UiColumn.query().where('table_key', TABLE_KEY).orderBy('position')
	);

	readonly coverSize = $derived(
		this.#uiStateStore.get(LibraryColumnsStore.coverSizeField)
	);

	readonly columns = $derived.by((): LibraryColumnState[] => {
		const stored = this.#rows.rows.flatMap((row) => {
			const key = LIBRARY_COLUMNS.find(
				(column) => column === row.column_key
			);
			return key
				? [{ key, isVisible: row.visible, width: row.width }]
				: [];
		});
		const missing = LIBRARY_COLUMNS.filter(
			(key) => !stored.some((column) => column.key === key)
		).map((key) => ({
			key,
			isVisible: !HIDDEN_BY_DEFAULT.includes(key),
			width: null,
		}));
		return [...stored, ...missing];
	});

	readonly hasCover = $derived(this.coverSize !== 'none');
	readonly visibleColumns = $derived(
		this.columns.filter((column) => column.isVisible)
	);

	async setCoverSize(coverSize: CoverSize): Promise<void> {
		await this.#uiStateStore.set(
			LibraryColumnsStore.coverSizeField,
			coverSize
		);
	}

	async setVisible(key: LibraryColumn, isVisible: boolean): Promise<void> {
		await this.save(
			this.columns.map((column) =>
				column.key === key ? { ...column, isVisible } : column
			)
		);
	}

	async setWidth(key: LibraryColumn, width: number | null): Promise<void> {
		await this.save(
			this.columns.map((column) =>
				column.key === key ? { ...column, width } : column
			)
		);
	}

	async reorder(keys: readonly LibraryColumn[]): Promise<void> {
		await this.save(
			keys.flatMap(
				(key) => this.columns.find((column) => column.key === key) ?? []
			)
		);
	}

	async reset(): Promise<void> {
		await this.save([]);
		await this.#uiStateStore.set(
			LibraryColumnsStore.coverSizeField,
			LibraryColumnsStore.coverSizeField.initial
		);
	}

	private async save(columns: readonly LibraryColumnState[]): Promise<void> {
		await Model.database.transaction(async (tx) => {
			const existing = await UiColumn.query()
				.where('table_key', TABLE_KEY)
				.toArray(tx);
			await UiColumn.deleteMany(existing, tx);
			await UiColumn.createMany(
				columns.map((column, index) => ({
					table_key: TABLE_KEY,
					column_key: column.key,
					visible: column.isVisible,
					position: String(index).padStart(2, '0'),
					width: column.width,
				})),
				tx
			);
		});
	}
}
