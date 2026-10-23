import { SvelteSet } from 'svelte/reactivity';

import { ModTable } from '@/lib/mod-table/mod-table-state.svelte';
import type { Mod } from '@/lib/models';
import type { Selection } from '@/lib/selection.svelte';
import {
	LibraryStore,
	TableLayoutStore,
	type LibrarySource,
} from '@/lib/store';

import { PICKER_LAYOUT } from './picker-layout';

export type PickerTarget =
	| { kind: 'group'; name: string; linkedCount: number }
	| { kind: 'profile'; name: string };

export type PickerRow = {
	mod: Mod;
	isAdded: boolean;
};

export type ModPickerOptions = {
	excludeIds: () => readonly number[];
	openDetails: (mod: Mod) => void;
};

export class ModPicker {
	private static readonly collator = new Intl.Collator(undefined, {
		sensitivity: 'base',
	});

	readonly #libraryStore = LibraryStore.get();
	readonly #excludeIds: () => readonly number[];
	readonly #sources = new SvelteSet<LibrarySource>();
	readonly #tagIds = new SvelteSet<number>();

	readonly table: ModTable<PickerRow>;

	search = $state('');
	hideAdded = $state(true);
	unplacedOnly = $state(false);

	constructor(options: ModPickerOptions) {
		this.#excludeIds = options.excludeIds;
		this.table = new ModTable<PickerRow>({
			layout: TableLayoutStore.get().layoutOf(PICKER_LAYOUT),
			settingsTitleKey: 'modPicker.title',
			rows: () => this.rows,
			keyOf: (row) => row.mod.id,
			modOf: (row) => row.mod,
			inset: 'drawer',
			isSelectable: true,
			isRowDisabled: (row) => row.isAdded,
			rowActionsWidth: 'auto',
			drag: {
				hasHandle: false,
				onDropped: (landed) => {
					if (landed) this.selection.clear();
				},
			},
			openDetails: options.openDetails,
		});
	}

	get selection(): Selection<number> {
		return this.table.selection!;
	}

	readonly isDragging = $derived.by(() => this.table.drag!.isSource);
	readonly sources = $derived([...this.#sources]);
	readonly tagIds = $derived([...this.#tagIds]);
	readonly isFiltered = $derived(
		this.search.trim().length > 0 ||
			this.unplacedOnly ||
			this.#sources.size > 0 ||
			this.#tagIds.size > 0
	);
	readonly #sorted = $derived.by(() =>
		this.#libraryStore.list
			.filter((mod) => !mod.isMissing)
			.toSorted((a, b) =>
				ModPicker.collator.compare(a.displayTitle, b.displayTitle)
			)
	);
	readonly matching = $derived.by((): PickerRow[] => {
		const query = this.search.trim().toLowerCase();
		const excluded = Object.fromEntries(
			this.#excludeIds().map((id) => [id, true])
		) as Record<number, true>;
		return this.#sorted
			.filter(
				(mod) =>
					!query ||
					this.#libraryStore.searchTextOf(mod).includes(query)
			)
			.filter(
				(mod) =>
					!this.#sources.size ||
					this.#sources.has(mod.source as LibrarySource)
			)
			.filter(
				(mod) =>
					!this.#tagIds.size ||
					this.#libraryStore
						.tagsOf(mod)
						.some((tag) => this.#tagIds.has(tag.id))
			)
			.filter(
				(mod) =>
					!this.unplacedOnly ||
					!this.#libraryStore.placementOf(mod).profiles.length
			)
			.map((mod) => ({ mod, isAdded: mod.id in excluded }));
	});
	readonly rows = $derived(
		this.hideAdded
			? this.matching.filter((row) => !row.isAdded)
			: this.matching
	);
	readonly available = $derived(this.matching.filter((row) => !row.isAdded));
	readonly addedCount = $derived(
		this.matching.filter((row) => row.isAdded).length
	);
	readonly selectedMods = $derived.by(() =>
		this.available
			.filter((row) => this.selection.has(row.mod.id))
			.map((row) => row.mod)
	);

	hasSource(source: LibrarySource): boolean {
		return this.#sources.has(source);
	}

	toggleSource(source: LibrarySource): void {
		if (!this.#sources.delete(source)) this.#sources.add(source);
	}

	hasTag(tagId: number): boolean {
		return this.#tagIds.has(tagId);
	}

	toggleTag(tagId: number): void {
		if (!this.#tagIds.delete(tagId)) this.#tagIds.add(tagId);
	}

	clearFilters(): void {
		this.search = '';
		this.unplacedOnly = false;
		this.#sources.clear();
		this.#tagIds.clear();
	}

	armStack(event: PointerEvent): void {
		this.table.drag!.armStack(
			event,
			this.selectedMods.map((mod) => mod.id)
		);
	}

	modsFor(ids: readonly number[]): Mod[] {
		return ids.flatMap((id) => this.#libraryStore.modById(id) ?? []);
	}
}
