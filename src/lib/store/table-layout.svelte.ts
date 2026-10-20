import { ConnectionStore, Model } from '@7otion-tauri/orm';

import { UiColumn } from '@/lib/models';
import { COVER_SIZES, type CoverSize } from '@/lib/mod-table/mod-columns';
import { GamesStore, UiStateStore, type UiStateField } from '@/lib/store';

export type TableLayoutSpec<Column extends string> = {
	key: string;
	columns: readonly Column[];
	hiddenByDefault: readonly Column[];
};

export type ColumnState<Column extends string> = {
	key: Column;
	isVisible: boolean;
	width: number | null;
};

export class TableLayout<Column extends string> {
	readonly #spec: TableLayoutSpec<Column>;
	readonly #rows: () => readonly UiColumn[];
	readonly #uiStateStore = UiStateStore.get();
	readonly #gamesStore = GamesStore.get();
	readonly #coverSizeField: UiStateField<CoverSize>;
	readonly #rowDividerField: UiStateField<boolean>;

	constructor(
		spec: TableLayoutSpec<Column>,
		rows: () => readonly UiColumn[]
	) {
		this.#spec = spec;
		this.#rows = rows;
		this.#coverSizeField = {
			key: `${spec.key}.cover_size`,
			initial: 'compact',
			is: (value): value is CoverSize =>
				COVER_SIZES.some((size) => size === value),
		};
		this.#rowDividerField = {
			key: `${spec.key}.row_divider`,
			initial: false,
			is: (value): value is boolean => typeof value === 'boolean',
		};
	}

	readonly savedScrollOffset = $derived.by((): number | null => {
		const game = this.#gamesStore.current;
		return this.#uiStateStore.isLoaded && game
			? this.#uiStateStore.get(this.scrollOffsetField(game.app_id))
			: null;
	});
	readonly coverSize = $derived.by(() =>
		this.#uiStateStore.get(this.#coverSizeField)
	);
	readonly hasRowDivider = $derived.by(() =>
		this.#uiStateStore.get(this.#rowDividerField)
	);

	readonly columns = $derived.by((): ColumnState<Column>[] => {
		const { columns, hiddenByDefault } = this.#spec;
		const stored = this.#rows().flatMap((row) => {
			const key = columns.find((column) => column === row.column_key);
			return key
				? [{ key, isVisible: row.visible, width: row.width }]
				: [];
		});
		const missing = columns
			.filter((key) => !stored.some((column) => column.key === key))
			.map((key) => ({
				key,
				isVisible: !hiddenByDefault.includes(key),
				width: null,
			}));
		return [...stored, ...missing];
	});

	readonly hasCover = $derived(this.coverSize !== 'none');
	readonly visibleColumns = $derived(
		this.columns.filter((column) => column.isVisible)
	);

	async setScrollOffset(appId: number, offset: number): Promise<void> {
		await this.#uiStateStore.set(
			this.scrollOffsetField(appId),
			Math.round(offset)
		);
	}

	async setCoverSize(coverSize: CoverSize): Promise<void> {
		await this.#uiStateStore.set(this.#coverSizeField, coverSize);
	}

	async setRowDivider(hasRowDivider: boolean): Promise<void> {
		await this.#uiStateStore.set(this.#rowDividerField, hasRowDivider);
	}

	async setVisible(key: Column, isVisible: boolean): Promise<void> {
		await this.save(
			this.columns.map((column) =>
				column.key === key ? { ...column, isVisible } : column
			)
		);
	}

	async setWidth(key: Column, width: number | null): Promise<void> {
		await this.save(
			this.columns.map((column) =>
				column.key === key ? { ...column, width } : column
			)
		);
	}

	async reorder(keys: readonly Column[]): Promise<void> {
		await this.save(
			keys.flatMap(
				(key) => this.columns.find((column) => column.key === key) ?? []
			)
		);
	}

	async reset(): Promise<void> {
		await this.save([]);
		await this.#uiStateStore.set(
			this.#coverSizeField,
			this.#coverSizeField.initial
		);
		await this.#uiStateStore.set(
			this.#rowDividerField,
			this.#rowDividerField.initial
		);
	}

	private scrollOffsetField(appId: number): UiStateField<number> {
		return {
			key: `${this.#spec.key}.scroll_offset.${appId}`,
			initial: 0,
			is: (value): value is number => typeof value === 'number',
		};
	}

	private async save(columns: readonly ColumnState<Column>[]): Promise<void> {
		const tableKey = this.#spec.key;
		await Model.database.transaction(async (tx) => {
			const existing = await UiColumn.query()
				.where('table_key', tableKey)
				.toArray(tx);
			await UiColumn.deleteMany(existing, tx);
			await UiColumn.createMany(
				columns.map((column, index) => ({
					table_key: tableKey,
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

export class TableLayoutStore extends ConnectionStore {
	readonly #rows = this.query(() => UiColumn.query().orderBy('position'));
	readonly #layouts: Record<string, TableLayout<string>> = {};

	layoutOf<Column extends string>(
		spec: TableLayoutSpec<Column>
	): TableLayout<Column> {
		const existing = this.#layouts[spec.key];
		if (existing) return existing as TableLayout<Column>;
		const layout = new TableLayout(spec, () =>
			this.#rows.rows.filter((row) => row.table_key === spec.key)
		);
		this.#layouts[spec.key] = layout as TableLayout<string>;
		return layout;
	}
}
