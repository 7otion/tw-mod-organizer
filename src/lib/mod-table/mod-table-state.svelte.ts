import { tick, untrack } from 'svelte';

import type { MessageKey } from '@/lib/i18n/message-key';
import type { Mod } from '@/lib/models';
import {
	ScrollMemory,
	type ScrollMemoryOptions,
} from '@/lib/scroll-memory.svelte';
import { Selection } from '@/lib/selection.svelte';
import { LibraryStore, type TableLayout } from '@/lib/store';
import { VirtualList } from '@/lib/virtual-list.svelte';

import { ColumnLayout } from './column-layout.svelte';
import {
	DIVIDER_GAP,
	MOD_COLUMN_SPECS,
	ROW_HEIGHTS,
	SOURCE_ICON_SIZES,
	type ModColumn,
	type ModSort,
} from './mod-columns';
import { RowDrag, type RowDragOptions } from './row-drag.svelte';

export type ModTableSort = {
	readonly key: ModSort | null;
	readonly isDescending: boolean;
	sortBy(key: ModSort): void;
};

export type ModTableScrollMemory<Key> = Pick<
	ScrollMemoryOptions<Key>,
	'key' | 'saved' | 'isFiltered' | 'save'
>;

export type TableInset = 'page' | 'drawer';

export type ModTableOptions<Row, ScrollKey> = {
	layout: TableLayout<ModColumn>;
	settingsTitleKey: MessageKey;
	rows: () => readonly Row[];
	keyOf: (row: Row) => number;
	modOf: (row: Row) => Mod;
	inset?: TableInset;
	isSelectable?: boolean;
	isRowDisabled?: (row: Row) => boolean;
	isNumbered?: boolean;
	rowActionsWidth?: string;
	sort?: ModTableSort;
	drag?: RowDragOptions;
	openDetails?: (mod: Mod) => void;
	scrollMemory?: ModTableScrollMemory<ScrollKey>;
};

export type VisibleRow<Row> = {
	row: Row;
	index: number;
	top: number;
};

const LIST_PADDING = 4;
const OVERSCAN_PX = 240;
const MIN_OVERSCAN = 2;
const GRIP_WIDTH = '16px';
const NUMBER_WIDTH = '28px';
const LINE_INSETS: Record<TableInset, number> = { page: 24, drawer: 10 };

export class ModTable<Row, ScrollKey = never> {
	readonly #options: ModTableOptions<Row, ScrollKey>;
	readonly #libraryStore = LibraryStore.get();
	readonly #scrollMemory: ScrollMemory<ScrollKey> | null;

	readonly layout: TableLayout<ModColumn>;
	readonly settingsTitleKey: MessageKey;
	readonly inset: TableInset;
	readonly lineInset: number;
	readonly isNumbered: boolean;
	readonly hasRowActions: boolean;
	readonly sort: ModTableSort | null;
	readonly selection: Selection<number> | null;
	readonly drag: RowDrag<Row> | null;
	readonly columnLayout: ColumnLayout<ModColumn>;
	readonly virtualList: VirtualList;

	viewport = $state<HTMLElement | null>(null);
	bulkBar = $state<HTMLElement | null>(null);
	isSettingsOpen = $state(false);
	renamingMod = $state.raw<Mod | null>(null);
	#detailsModId = $state<number | null>(null);

	constructor(options: ModTableOptions<Row, ScrollKey>) {
		this.#options = options;
		this.layout = options.layout;
		this.settingsTitleKey = options.settingsTitleKey;
		this.inset = options.inset ?? 'page';
		this.lineInset = LINE_INSETS[this.inset];
		this.isNumbered = options.isNumbered ?? false;
		this.hasRowActions = options.rowActionsWidth !== undefined;
		this.sort = options.sort ?? null;
		this.selection = options.isSelectable
			? new Selection<number>(() => this.selectableKeys)
			: null;
		this.drag = options.drag ? new RowDrag(this, options.drag) : null;
		this.columnLayout = new ColumnLayout<ModColumn>({
			layout: options.layout,
			specs: MOD_COLUMN_SPECS,
			coverColumn: 'mod',
			leadingWidths: [
				...(this.drag?.hasHandle ? [GRIP_WIDTH] : []),
				...(this.isNumbered ? [NUMBER_WIDTH] : []),
			],
			trailingWidths: options.rowActionsWidth
				? [options.rowActionsWidth]
				: [],
			defaultWidths: () => this.defaultWidths(),
		});
		this.virtualList = new VirtualList({
			count: () => this.rows.length,
			scrollElement: () => this.viewport,
			itemSize: () => this.rowHeight,
			itemKey: (index) => {
				const row = this.rows[index];
				return row === undefined ? index : options.keyOf(row);
			},
			sizeKey: () =>
				`${options.layout.coverSize}:${options.layout.hasRowDivider}`,
			paddingStart: LIST_PADDING,
			paddingEnd: LIST_PADDING,
			endInset: () => this.#bulkBarInset,
			overscan: () =>
				Math.max(MIN_OVERSCAN, Math.ceil(OVERSCAN_PX / this.rowHeight)),
			onScroll: (offset) => this.#scrollMemory?.remember(offset),
		});
		this.#scrollMemory = options.scrollMemory
			? new ScrollMemory<ScrollKey>({
					...options.scrollMemory,
					list: this.virtualList,
					viewport: () => this.viewport,
					hasRows: () => this.rows.length > 0,
				})
			: null;
		if (this.selection) this.followSelection(this.selection);
	}

	readonly #baseRows = $derived.by(() => this.#options.rows());
	readonly baseKeys = $derived.by(() =>
		this.#baseRows.map(this.#options.keyOf)
	);
	readonly rows = $derived.by((): readonly Row[] => {
		const preview = this.drag?.preview;
		if (!preview) return this.#baseRows;
		const keyOf = this.#options.keyOf;
		const byKey = Object.fromEntries(
			this.#baseRows.map((row) => [keyOf(row), row])
		) as Record<number, Row>;
		const previewed = preview.flatMap((key) => byKey[key] ?? []);
		if (previewed.length === this.#baseRows.length) return previewed;
		const placed = Object.fromEntries(
			preview.map((key) => [key, true])
		) as Record<number, true>;
		return [
			...previewed,
			...this.#baseRows.filter((row) => !(keyOf(row) in placed)),
		];
	});
	readonly keys = $derived.by(() => this.rows.map(this.#options.keyOf));
	readonly selectableKeys = $derived.by((): readonly number[] => {
		const isDisabled = this.#options.isRowDisabled;
		if (!isDisabled) return this.keys;
		return this.rows
			.filter((row) => !isDisabled(row))
			.map(this.#options.keyOf);
	});
	readonly rowHeight = $derived.by(
		() =>
			ROW_HEIGHTS[this.layout.coverSize] +
			(this.layout.hasRowDivider ? DIVIDER_GAP : 0)
	);
	readonly #bulkBarInset = $derived(
		this.bulkBar
			? this.bulkBar.offsetParent!.clientHeight - this.bulkBar.offsetTop
			: 0
	);
	readonly visibleRows = $derived.by((): VisibleRow<Row>[] => {
		const visible = this.virtualList.items.flatMap(
			(item): VisibleRow<Row>[] => {
				const row = this.rows[item.index];
				return row === undefined
					? []
					: [{ row, index: item.index, top: item.start }];
			}
		);
		if (!this.drag?.preview) return visible;
		const keyOf = this.#options.keyOf;
		const basePosition = Object.fromEntries(
			this.baseKeys.map((key, position) => [key, position])
		) as Record<number, number>;
		return visible.toSorted(
			(a, b) =>
				(basePosition[keyOf(a.row)] ?? 0) -
				(basePosition[keyOf(b.row)] ?? 0)
		);
	});
	readonly hasVersionColumn = $derived.by(() =>
		this.layout.visibleColumns.some((column) => column.key === 'version')
	);
	readonly detailsMod = $derived.by(() =>
		this.#detailsModId === null
			? null
			: this.#libraryStore.modById(this.#detailsModId)
	);

	keyOf(row: Row): number {
		return this.#options.keyOf(row);
	}

	modOf(row: Row): Mod {
		return this.#options.modOf(row);
	}

	isRowDisabled(row: Row): boolean {
		return this.#options.isRowDisabled?.(row) ?? false;
	}

	rowByKey(key: number): Row | null {
		return (
			this.#baseRows.find((row) => this.#options.keyOf(row) === key) ??
			null
		);
	}

	openDetails(mod: Mod): void {
		if (this.#options.openDetails) this.#options.openDetails(mod);
		else this.#detailsModId = mod.id;
	}

	closeDetails(): void {
		this.#detailsModId = null;
	}

	handleKeydown(event: KeyboardEvent): void {
		if (event.defaultPrevented || this.drag?.isSource) return;
		if (event.key === 'Escape') {
			if (this.#detailsModId !== null) this.closeDetails();
			else if (this.selection?.count) this.selection.clear();
			else return;
			event.preventDefault();
		} else if (
			event.ctrlKey &&
			event.key.toLowerCase() === 'a' &&
			this.selection &&
			!ModTable.isTyping(event.target)
		) {
			event.preventDefault();
			this.selection.selectAll();
		} else if (
			event.key === 'F2' &&
			this.selection?.only !== null &&
			this.selection?.only !== undefined &&
			!ModTable.isTyping(event.target)
		) {
			event.preventDefault();
			this.renamingMod = this.#libraryStore.modById(this.selection.only);
		} else if (
			(event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
			this.selection &&
			!ModTable.isTyping(event.target)
		) {
			event.preventDefault();
			this.selection.step(
				event.key === 'ArrowDown' ? 1 : -1,
				event.shiftKey || event.ctrlKey
			);
			this.revealCursor();
		}
	}

	private revealCursor(): void {
		const index = this.keys.indexOf(this.selection!.cursor!);
		if (index < 0) return;
		void tick().then(() => this.virtualList.scrollToIndex(index));
	}

	private followSelection(selection: Selection<number>): void {
		$effect(() => {
			const only = selection.only;
			if (only === null) return;
			untrack(() => {
				if (this.#detailsModId !== null) this.#detailsModId = only;
			});
		});
	}

	private defaultWidths(): Record<ModColumn, string> {
		const mods = this.#libraryStore.list;
		const hasTags = mods.some(
			(mod) => this.#libraryStore.tagsOf(mod).length
		);
		const hasProfiles = mods.some(
			(mod) => !this.#libraryStore.isUnused(mod)
		);
		return {
			author: '120px',
			tags: hasTags ? '170px' : '2.5rem',
			source: `${SOURCE_ICON_SIZES[this.layout.coverSize]}px`,
			mod: 'minmax(0,1fr)',
			profiles: hasProfiles ? '196px' : '5rem',
			size: '64px',
			updated: '80px',
			added: '72px',
			version: '64px',
		};
	}

	static isTyping(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement)
		);
	}
}
