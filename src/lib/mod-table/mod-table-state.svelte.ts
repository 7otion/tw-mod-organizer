import { tick, untrack } from 'svelte';
import type { ClassValue } from 'svelte/elements';

import type { MessageKey } from '@/lib/i18n/message-key';
import type { Mod } from '@/lib/models';
import {
	ScrollMemory,
	type ScrollMemoryOptions,
} from '@/lib/scroll-memory.svelte';
import { Selection } from '@/lib/selection.svelte';
import {
	LibraryStore,
	NoticesStore,
	type LocateTarget,
	type TableLayout,
} from '@/lib/store';
import { VirtualList } from '@/lib/virtual-list.svelte';

import { ColumnLayout } from './column-layout.svelte';
import type { EnableBoxState } from './enable-box.svelte';
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

type EnableState = 'on' | 'off' | 'mixed' | null;

type ModTableEnable<Row> = {
	isEnabled(row: Row): EnableBoxState | null;
	setEnabled(rows: readonly Row[], isEnabled: boolean): Promise<void>;
	rows?: () => readonly Row[];
};

export type PageKeys = {
	searchInput: HTMLInputElement | null;
	picker?: { isDragging: boolean; selection: Selection<number> };
	isPicking?: () => boolean;
	closePicker?: () => void;
	onDelete?: () => void;
};

export type ModTableOptions<Row, ScrollKey> = {
	layout: TableLayout<ModColumn>;
	settingsTitleKey: MessageKey;
	rows: () => readonly Row[];
	keyOf: (row: Row) => number;
	modOf: (row: Row) => Mod;
	inset?: TableInset;
	hasFlags?: boolean;
	isModRow?: (row: Row) => boolean;
	heightOf?: (row: Row) => number | null;
	numberOf?: (row: Row) => number;
	enable?: ModTableEnable<Row>;
	reveal?: (modId: number) => Promise<boolean>;
	isSelectable?: boolean;
	isRowDisabled?: (row: Row) => boolean;
	classOf?: (row: Row) => ClassValue | null;
	isNumbered?: boolean;
	rowActionsWidth?: string;
	sort?: ModTableSort;
	drag?: RowDragOptions;
	openDetails?: (mod: Mod) => void;
	scrollMemory?: ModTableScrollMemory<ScrollKey>;
};

export type Located = {
	key: number;
	color: string;
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
const ENABLE_WIDTH = '20px';
const FLAGS_WIDTH = '68px';
const LOCATE_MS = 1200;
const LINE_INSETS: Record<TableInset, number> = { page: 24, drawer: 10 };

export const ROW_INSETS: Record<TableInset, string> = {
	page: 'inset-x-6',
	drawer: 'inset-x-2.5',
};

export const HEADER_INSETS: Record<TableInset, string> = {
	page: 'mx-6',
	drawer: 'mx-2.5',
};

export class ModTable<Row, ScrollKey = never> implements LocateTarget {
	readonly #options: ModTableOptions<Row, ScrollKey>;
	readonly #libraryStore = LibraryStore.get();
	readonly #noticesStore = NoticesStore.get();
	readonly #scrollMemory: ScrollMemory<ScrollKey> | null;
	#locateTimer: ReturnType<typeof setTimeout> | null = null;

	readonly layout: TableLayout<ModColumn>;
	readonly settingsTitleKey: MessageKey;
	readonly inset: TableInset;
	readonly lineInset: number;
	readonly hasFlags: boolean;
	readonly enable: ModTableEnable<Row> | null;
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
	located = $state.raw<Located | null>(null);
	#detailsModId = $state<number | null>(null);

	constructor(options: ModTableOptions<Row, ScrollKey>) {
		this.#options = options;
		this.layout = options.layout;
		this.settingsTitleKey = options.settingsTitleKey;
		this.inset = options.inset ?? 'page';
		this.lineInset = LINE_INSETS[this.inset];
		this.hasFlags = options.hasFlags ?? this.inset === 'page';
		this.enable = options.enable ?? null;
		this.isNumbered = options.isNumbered ?? false;
		this.hasRowActions = options.rowActionsWidth !== undefined;
		this.sort = options.sort ?? null;
		this.selection = options.isSelectable
			? new Selection<number>(() => this.selectableKeys)
			: null;
		this.drag = options.drag ? new RowDrag<Row>(this, options.drag) : null;
		this.columnLayout = new ColumnLayout<ModColumn>({
			layout: options.layout,
			specs: MOD_COLUMN_SPECS,
			coverColumn: 'mod',
			flagsWidth: this.hasFlags ? FLAGS_WIDTH : null,
			leadingWidths: [
				...(this.drag?.hasHandle ? [GRIP_WIDTH] : []),
				...(this.isNumbered ? [NUMBER_WIDTH] : []),
				...(this.enable ? [ENABLE_WIDTH] : []),
			],
			trailingWidths: options.rowActionsWidth
				? [options.rowActionsWidth]
				: [],
			defaultWidths: () => this.defaultWidths(),
		});
		this.virtualList = new VirtualList({
			count: () => this.rows.length,
			scrollElement: () => this.viewport,
			itemSize: (index) => this.heightOf(this.rows[index]),
			itemKey: (index) => {
				const row = this.rows[index];
				return row === undefined ? index : options.keyOf(row);
			},
			sizeKey: () =>
				`${options.layout.coverSize}:${options.layout.hasRowDivider}:${this.#heightsKey}`,
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
		const { isRowDisabled, isModRow } = this.#options;
		if (!isRowDisabled && !isModRow) return this.keys;
		return this.rows
			.filter((row) => this.isRowSelectable(row))
			.map(this.#options.keyOf);
	});
	readonly enableState = $derived.by((): EnableState => {
		const enable = this.enable;
		if (!enable) return null;
		let on = 0;
		let total = 0;
		let hasMixed = false;
		for (const row of enable.rows?.() ?? this.rows) {
			const state = enable.isEnabled(row);
			if (state === null) continue;
			total++;
			if (state === true) on++;
			else if (state === 'mixed') hasMixed = true;
		}
		if (!total) return null;
		if (hasMixed) return 'mixed';
		if (on === 0) return 'off';
		return on === total ? 'on' : 'mixed';
	});
	readonly #heightsKey = $derived.by(() => {
		const heightOf = this.#options.heightOf;
		if (!heightOf) return '';
		return this.rows.map((row) => heightOf(row) ?? '').join(',');
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

	classOf(row: Row): ClassValue | null {
		return this.#options.classOf?.(row) ?? null;
	}

	isRowSelectable(row: Row): boolean {
		return this.isModRow(row) && !this.isRowDisabled(row);
	}

	isModRow(row: Row): boolean {
		return this.#options.isModRow?.(row) ?? true;
	}

	isRowDraggable(row: Row): boolean {
		return (
			!this.drag || this.drag.unitOf(this.#options.keyOf(row)) !== null
		);
	}

	heightOf(row: Row | undefined): number {
		if (row === undefined) return this.rowHeight;
		return this.#options.heightOf?.(row) ?? this.rowHeight;
	}

	numberOf(row: Row, index: number): number {
		return this.#options.numberOf ? this.#options.numberOf(row) : index + 1;
	}

	async toggleAllEnabled(): Promise<void> {
		const enable = this.enable!;
		const rows = (enable.rows?.() ?? this.rows).filter(
			(row) => enable.isEnabled(row) !== null
		);
		await enable.setEnabled(rows, this.enableState !== 'on');
	}

	selectedRows(): Row[] {
		const selection = this.selection;
		if (!selection?.count) return [];
		return this.rows.filter((row) =>
			selection.has(this.#options.keyOf(row))
		);
	}

	modByKey(key: number): Mod | null {
		const row = this.rowByKey(key);
		return row && this.isModRow(row) ? this.#options.modOf(row) : null;
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

	async locate(modId: number, color: string): Promise<boolean> {
		let index = this.indexOfMod(modId);
		if (
			index < 0 &&
			this.#options.reveal &&
			(await this.#options.reveal(modId))
		) {
			await tick();
			index = this.indexOfMod(modId);
		}
		if (index < 0) return false;
		this.virtualList.scrollToIndex(index);
		this.located = { key: this.#options.keyOf(this.rows[index]), color };
		if (this.#locateTimer) clearTimeout(this.#locateTimer);
		this.#locateTimer = setTimeout(() => (this.located = null), LOCATE_MS);
		return true;
	}

	scrollToKey(key: number): void {
		const index = this.keys.indexOf(key);
		if (index >= 0) this.virtualList.scrollToIndex(index);
	}

	register(): () => void {
		if (!this.hasFlags) return () => {};
		this.#noticesStore.registerTable(this);
		return () => this.#noticesStore.unregisterTable(this);
	}

	handlePageKeydown(event: KeyboardEvent, page: PageKeys): void {
		if (event.ctrlKey && event.key.toLowerCase() === 'f') {
			event.preventDefault();
			page.searchInput?.focus();
			return;
		}
		if (event.defaultPrevented) return;
		const isPicking = page.isPicking?.() ?? false;
		if (
			event.key === 'Escape' &&
			isPicking &&
			this.#detailsModId === null
		) {
			const picker = page.picker!;
			if (picker.isDragging) return;
			if (picker.selection.count) picker.selection.clear();
			else page.closePicker?.();
			event.preventDefault();
			return;
		}
		if (
			event.key === 'Delete' &&
			page.onDelete &&
			!isPicking &&
			!ModTable.isTyping(event.target)
		) {
			event.preventDefault();
			page.onDelete();
			return;
		}
		this.handleKeydown(event);
	}

	handleKeydown(event: KeyboardEvent): void {
		if (event.defaultPrevented || this.drag?.isSource) return;
		if (event.key === 'Escape') {
			if (this.#detailsModId !== null) this.closeDetails();
			else if (this.#noticesStore.detailsMod)
				this.#noticesStore.closeDetails();
			else if (this.#noticesStore.isOpen) this.#noticesStore.close();
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
			event.key === ' ' &&
			this.enable &&
			this.selection?.count &&
			!ModTable.isTyping(event.target) &&
			!ModTable.isInteractive(event.target)
		) {
			event.preventDefault();
			const rows = this.selectedRows();
			const isAllOn = rows.every((row) => {
				const state = this.enable!.isEnabled(row);
				return state === null || state === true;
			});
			void this.enable.setEnabled(rows, !isAllOn);
		} else if (
			event.key === 'F2' &&
			this.selection?.only !== null &&
			this.selection?.only !== undefined &&
			!ModTable.isTyping(event.target)
		) {
			event.preventDefault();
			this.renamingMod = this.modByKey(this.selection.only);
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

	private indexOfMod(modId: number): number {
		return this.rows.findIndex(
			(row) => this.isModRow(row) && this.#options.modOf(row).id === modId
		);
	}

	private followSelection(selection: Selection<number>): void {
		$effect(() => {
			const keys = this.selectableKeys;
			untrack(() => selection.retain(keys));
		});
		$effect(() => {
			const only = selection.only;
			if (only === null) return;
			untrack(() => {
				if (this.#detailsModId === null) return;
				const mod = this.modByKey(only);
				if (mod) this.#detailsModId = mod.id;
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
			author: 'minmax(0,1fr)',
			tags: hasTags ? 'minmax(0,1.3fr)' : '2.5rem',
			source: `${SOURCE_ICON_SIZES[this.layout.coverSize]}px`,
			mod: 'minmax(0,4fr)',
			profiles: hasProfiles ? 'minmax(0,1.5fr)' : '5rem',
			size: '64px',
			updated: '80px',
			added: '72px',
			version: '64px',
		};
	}

	private static isInteractive(target: EventTarget | null): boolean {
		return (
			target instanceof Element &&
			target.closest('button, a, [role="button"], [role="checkbox"]') !==
				null
		);
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
