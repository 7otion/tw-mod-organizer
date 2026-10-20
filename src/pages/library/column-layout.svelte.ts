import {
	LibraryColumnsStore,
	LibraryFilterStore,
	LibraryStore,
	type LibraryColumn,
	type LibraryColumnState,
} from '@/lib/store';

import { COLUMN_INFO, SOURCE_ICON_SIZES } from './library-columns';

type Resizing = {
	key: LibraryColumn;
	width: number;
};

const MIN_COLUMN_WIDTH = 40;
const CHECKBOX_WIDTH = '16px';

export class ColumnLayout {
	readonly #libraryStore = LibraryStore.get();
	readonly #libraryFilterStore = LibraryFilterStore.get();
	readonly #libraryColumnsStore = LibraryColumnsStore.get();

	#resizing = $state.raw<Resizing | null>(null);

	readonly #defaultWidths = $derived.by((): Record<LibraryColumn, string> => {
		const mods = this.#libraryFilterStore.visibleMods;
		const hasTags = mods.some(
			(mod) => this.#libraryStore.tagsOf(mod).length
		);
		const hasProfiles = mods.some(
			(mod) => !this.#libraryStore.isUnused(mod)
		);
		return {
			author: '120px',
			tags: hasTags ? '170px' : '2.5rem',
			source: `${SOURCE_ICON_SIZES[this.#libraryColumnsStore.coverSize]}px`,
			mod: 'minmax(0,1fr)',
			profiles: hasProfiles ? '196px' : '5rem',
			size: '64px',
			updated: '80px',
			added: '72px',
			version: '64px',
		};
	});
	readonly #coverWidth = $derived(
		`var(--thumb-${this.#libraryColumnsStore.coverSize})`
	);
	readonly template = $derived(
		[
			CHECKBOX_WIDTH,
			...this.#libraryColumnsStore.visibleColumns.flatMap((column) =>
				column.key === 'mod' && this.#libraryColumnsStore.hasCover
					? [this.#coverWidth, this.widthOf(column)]
					: [this.widthOf(column)]
			),
		].join(' ')
	);

	widthOf(column: LibraryColumnState): string {
		if (COLUMN_INFO[column.key].width)
			return this.#defaultWidths[column.key];
		if (this.#resizing?.key === column.key)
			return `${this.#resizing.width}px`;
		return column.width
			? `${column.width}px`
			: this.#defaultWidths[column.key];
	}

	startResize(event: PointerEvent, key: LibraryColumn): void {
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
			void this.#libraryColumnsStore
				.setWidth(done.key, done.width)
				.finally(() => (this.#resizing = null));
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', stop);
	}
}
