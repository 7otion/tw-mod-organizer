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

export type ModTableSort = {
	readonly key: ModSort | null;
	readonly isDescending: boolean;
	sortBy(key: ModSort): void;
};

export type ModTableScrollMemory<Key> = Pick<
	ScrollMemoryOptions<Key>,
	'key' | 'saved' | 'isFiltered' | 'save'
>;

export type ModTableOptions<Row, ScrollKey> = {
	layout: TableLayout<ModColumn>;
	settingsTitleKey: MessageKey;
	rows: () => readonly Row[];
	keyOf: (row: Row) => number;
	modOf: (row: Row) => Mod;
	isSelectable?: boolean;
	sort?: ModTableSort;
	scrollMemory?: ModTableScrollMemory<ScrollKey>;
};

export type VisibleRow<Row> = {
	row: Row;
	top: number;
};

const LIST_PADDING = 4;
const CHECKBOX_WIDTH = '16px';

export class ModTable<Row, ScrollKey = never> {
	readonly #options: ModTableOptions<Row, ScrollKey>;
	readonly #libraryStore = LibraryStore.get();
	readonly #scrollMemory: ScrollMemory<ScrollKey> | null;

	readonly layout: TableLayout<ModColumn>;
	readonly settingsTitleKey: MessageKey;
	readonly sort: ModTableSort | null;
	readonly selection: Selection<number> | null;
	readonly columnLayout: ColumnLayout<ModColumn>;
	readonly virtualList: VirtualList;

	viewport = $state<HTMLElement | null>(null);
	bulkBar = $state<HTMLElement | null>(null);
	isSettingsOpen = $state(false);
	#detailsModId = $state<number | null>(null);

	constructor(options: ModTableOptions<Row, ScrollKey>) {
		this.#options = options;
		this.layout = options.layout;
		this.settingsTitleKey = options.settingsTitleKey;
		this.sort = options.sort ?? null;
		this.selection = options.isSelectable
			? new Selection<number>(() => this.keys)
			: null;
		this.columnLayout = new ColumnLayout<ModColumn>({
			layout: options.layout,
			specs: MOD_COLUMN_SPECS,
			coverColumn: 'mod',
			leadingWidths: this.selection ? [CHECKBOX_WIDTH] : [],
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

	readonly rows = $derived.by(() => this.#options.rows());
	readonly keys = $derived.by(() => this.rows.map(this.#options.keyOf));
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
	readonly visibleRows = $derived.by(() =>
		this.virtualList.items.flatMap((item): VisibleRow<Row>[] => {
			const row = this.rows[item.index];
			return row === undefined ? [] : [{ row, top: item.start }];
		})
	);
	readonly detailsMod = $derived(
		this.#libraryStore.list.find((mod) => mod.id === this.#detailsModId) ??
			null
	);

	keyOf(row: Row): number {
		return this.#options.keyOf(row);
	}

	modOf(row: Row): Mod {
		return this.#options.modOf(row);
	}

	openDetails(mod: Mod): void {
		this.#detailsModId = mod.id;
	}

	closeDetails(): void {
		this.#detailsModId = null;
	}

	handleKeydown(event: KeyboardEvent): void {
		if (event.defaultPrevented) return;
		if (event.key === 'Escape') {
			if (this.#detailsModId !== null) this.closeDetails();
			else this.selection?.clear();
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
		const mods = this.rows.map(this.#options.modOf);
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

	private static isTyping(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement)
		);
	}
}
