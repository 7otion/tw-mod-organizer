import type { ColumnState, TableLayout } from '@/lib/store';

import type { ColumnSpec } from './mod-columns';

export type ColumnLayoutOptions<Column extends string> = {
	layout: TableLayout<Column>;
	specs: Record<Column, ColumnSpec>;
	coverColumn: Column;
	flagsWidth: string | null;
	leadingWidths: readonly string[];
	trailingWidths: readonly string[];
	defaultWidths: () => Record<Column, string>;
};

type Resizing<Column> = {
	key: Column;
	width: number;
};

const MIN_COLUMN_WIDTH = 40;

export class ColumnLayout<Column extends string> {
	readonly #options: ColumnLayoutOptions<Column>;

	#resizing = $state.raw<Resizing<Column> | null>(null);

	constructor(options: ColumnLayoutOptions<Column>) {
		this.#options = options;
	}

	readonly #defaultWidths = $derived.by(() => this.#options.defaultWidths());
	readonly #coverWidth = $derived.by(
		() => `var(--thumb-${this.#options.layout.coverSize})`
	);
	readonly template = $derived.by(() => {
		const {
			layout,
			coverColumn,
			flagsWidth,
			leadingWidths,
			trailingWidths,
		} = this.#options;
		return [
			...leadingWidths,
			...layout.visibleColumns.flatMap((column) => {
				if (column.key !== coverColumn) return [this.widthOf(column)];
				return [
					...(layout.hasCover ? [this.#coverWidth] : []),
					this.widthOf(column),
					...(flagsWidth ? [flagsWidth] : []),
				];
			}),
			...trailingWidths,
		].join(' ');
	});

	widthOf(column: ColumnState<Column>): string {
		if (this.#options.specs[column.key].width)
			return this.#defaultWidths[column.key];
		if (this.#resizing?.key === column.key)
			return `${this.#resizing.width}px`;
		return column.width
			? `${column.width}px`
			: this.#defaultWidths[column.key];
	}

	startResize(event: PointerEvent, key: Column): void {
		event.preventDefault();
		const cell = (event.currentTarget as HTMLElement).parentElement!;
		const startX = event.clientX;
		const startWidth = cell.getBoundingClientRect().width;
		this.#resizing = { key, width: Math.round(startWidth) };
		const move = (moved: PointerEvent) => {
			this.#resizing = {
				key,
				width: Math.max(
					MIN_COLUMN_WIDTH,
					Math.round(startWidth + moved.clientX - startX)
				),
			};
		};
		const stop = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', stop);
			const done = this.#resizing!;
			void this.#options.layout
				.setWidth(done.key, done.width)
				.finally(() => (this.#resizing = null));
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', stop);
	}
}
