import { ConnectionStore } from '@7otion-tauri/orm';

import type { Mod, ModSource, Profile } from '@/lib/models';
import {
	LibraryStore,
	ProfilesStore,
	UiStateStore,
	type UiStateField,
} from '@/lib/store';

export const LIBRARY_SCOPES = ['all', 'has', 'lacks'] as const;
export type LibraryScope = (typeof LIBRARY_SCOPES)[number];

export const LIBRARY_SOURCES = [
	'steam',
	'nexus',
	'manual',
] as const satisfies readonly ModSource[];
export type LibrarySource = (typeof LIBRARY_SOURCES)[number];

export const MOD_STATES = [
	'in-no-profile',
	'update-available',
	'missing-or-broken',
] as const;
export type ModState = (typeof MOD_STATES)[number];

export const LIBRARY_SORTS = [
	'title',
	'author',
	'source',
	'size',
	'updated',
	'added',
] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

type FilterSection = 'scope' | 'sources' | 'states' | 'tagIds';

type LibraryCounts = {
	scopes: Record<LibraryScope, number>;
	profiles: Record<number, number>;
	sources: Record<LibrarySource, number>;
	states: Record<ModState, number>;
	tags: Record<number, number>;
};

export class LibraryFilterStore extends ConnectionStore {
	private static readonly collator = new Intl.Collator();

	private static readonly compare: Record<
		LibrarySort,
		(a: Mod, b: Mod) => number
	> = {
		title: (a, b) =>
			LibraryFilterStore.collator.compare(a.displayTitle, b.displayTitle),
		author: (a, b) =>
			LibraryFilterStore.collator.compare(
				a.author_name ?? '',
				b.author_name ?? ''
			),
		source: (a, b) =>
			LibraryFilterStore.collator.compare(a.source, b.source),
		size: (a, b) => (a.size_bytes ?? 0) - (b.size_bytes ?? 0),
		updated: (a, b) =>
			(a.updatedAt?.getTime() ?? 0) - (b.updatedAt?.getTime() ?? 0),
		added: (a, b) =>
			(a.added_at?.getTime() ?? 0) - (b.added_at?.getTime() ?? 0),
	};

	private static readonly scopeField: UiStateField<LibraryScope> = {
		key: 'library.scope',
		initial: 'all',
		is: (value): value is LibraryScope =>
			LIBRARY_SCOPES.some((scope) => scope === value),
	};

	private static readonly scopeProfileField: UiStateField<number | null> = {
		key: 'library.scope_profile_id',
		initial: null,
		is: (value): value is number | null =>
			value === null || Number.isInteger(value),
	};

	private static readonly sortField: UiStateField<LibrarySort> = {
		key: 'library.sort',
		initial: 'updated',
		is: (value): value is LibrarySort =>
			LIBRARY_SORTS.some((sort) => sort === value),
	};

	private static readonly isDescendingField: UiStateField<boolean> = {
		key: 'library.sort_descending',
		initial: true,
		is: (value): value is boolean => typeof value === 'boolean',
	};

	readonly #libraryStore = LibraryStore.get();
	readonly #uiStateStore = UiStateStore.get();
	readonly #profilesStore = ProfilesStore.get();

	#search = $state('');

	sources = $state.raw<readonly LibrarySource[]>([]);
	states = $state.raw<readonly ModState[]>([]);
	tagIds = $state.raw<readonly number[]>([]);

	readonly scope = $derived(
		this.#uiStateStore.get(LibraryFilterStore.scopeField)
	);
	readonly sort = $derived(
		this.#uiStateStore.get(LibraryFilterStore.sortField)
	);
	readonly isDescending = $derived(
		this.#uiStateStore.get(LibraryFilterStore.isDescendingField)
	);
	readonly scopeProfile = $derived.by(() => {
		const id = this.#uiStateStore.get(LibraryFilterStore.scopeProfileField);
		return (
			this.#profilesStore.list.find((profile) => profile.id === id) ??
			this.#profilesStore.active
		);
	});

	readonly isFiltered = $derived(
		this.#search.trim() !== '' ||
			this.sources.length > 0 ||
			this.states.length > 0 ||
			this.tagIds.length > 0
	);

	readonly #searchTexts = $derived(
		Object.fromEntries(
			this.#libraryStore.list.map((mod) => [
				mod.id,
				[
					mod.displayTitle,
					mod.author_name ?? '',
					...this.#libraryStore.tagsOf(mod).map((tag) => tag.name),
				]
					.join(' ')
					.toLowerCase(),
			])
		) as Record<number, string>
	);

	readonly #sortedMods = $derived.by(() => {
		const direction = this.isDescending ? -1 : 1;
		const compare = LibraryFilterStore.compare[this.sort];
		return this.#libraryStore.list.toSorted(
			(a, b) => direction * compare(a, b)
		);
	});

	readonly #searchedMods = $derived.by(() => {
		const query = this.#search.trim().toLowerCase();
		if (!query) return this.#sortedMods;
		return this.#sortedMods.filter((mod) =>
			this.#searchTexts[mod.id]?.includes(query)
		);
	});

	readonly visibleMods = $derived(
		this.#searchedMods.filter((mod) =>
			Object.values(this.sectionsOf(mod)).every(Boolean)
		)
	);

	readonly #counts = $derived.by(() => this.count());

	readonly scopeCounts = $derived(this.#counts.scopes);
	readonly profileCounts = $derived(this.#counts.profiles);
	readonly sourceCounts = $derived(this.#counts.sources);
	readonly stateCounts = $derived(this.#counts.states);
	readonly tagCounts = $derived(this.#counts.tags);

	get search(): string {
		return this.#search;
	}

	setSearch(search: string): void {
		this.#search = search;
	}

	async setScope(scope: LibraryScope): Promise<void> {
		await this.#uiStateStore.set(LibraryFilterStore.scopeField, scope);
	}

	async pickProfile(profile: Profile): Promise<void> {
		await this.#uiStateStore.set(
			LibraryFilterStore.scopeProfileField,
			profile.id
		);
	}

	toggleSource(source: LibrarySource): void {
		this.sources = LibraryFilterStore.toggled(this.sources, source);
	}

	toggleState(state: ModState): void {
		this.states = LibraryFilterStore.toggled(this.states, state);
	}

	toggleTag(tagId: number): void {
		this.tagIds = LibraryFilterStore.toggled(this.tagIds, tagId);
	}

	clearSources(): void {
		this.sources = [];
	}

	clearStates(): void {
		this.states = [];
	}

	clearTags(): void {
		this.tagIds = [];
	}

	async sortBy(sort: LibrarySort): Promise<void> {
		const isDescending =
			sort === this.sort
				? !this.isDescending
				: sort === 'size' || sort === 'updated' || sort === 'added';
		await this.#uiStateStore.set(LibraryFilterStore.sortField, sort);
		await this.#uiStateStore.set(
			LibraryFilterStore.isDescendingField,
			isDescending
		);
	}

	private count(): LibraryCounts {
		const counts: LibraryCounts = {
			scopes: { all: 0, has: 0, lacks: 0 },
			profiles: {},
			sources: { steam: 0, nexus: 0, manual: 0 },
			states: {
				'in-no-profile': 0,
				'update-available': 0,
				'missing-or-broken': 0,
			},
			tags: {},
		};
		let passingOtherThanScope = 0;
		for (const mod of this.#searchedMods) {
			const { scope, sources, states, tagIds } = this.sectionsOf(mod);
			if (sources && states && tagIds) {
				passingOtherThanScope++;
				for (const scopeOption of LIBRARY_SCOPES)
					if (this.isInScope(mod, scopeOption, this.scopeProfile))
						counts.scopes[scopeOption]++;
				const profileIds =
					this.#libraryStore.placementOf(mod).profileIds;
				for (const profileId of LibraryFilterStore.unique(profileIds))
					counts.profiles[profileId] =
						(counts.profiles[profileId] ?? 0) + 1;
			}
			if (
				scope &&
				states &&
				tagIds &&
				LibraryFilterStore.isLibrarySource(mod.source)
			)
				counts.sources[mod.source]++;
			if (scope && sources && tagIds)
				for (const state of MOD_STATES)
					if (this.isInState(mod, state)) counts.states[state]++;
			if (scope && sources && states)
				for (const tag of this.#libraryStore.tagsOf(mod))
					counts.tags[tag.id] = (counts.tags[tag.id] ?? 0) + 1;
		}
		if (this.scope === 'lacks')
			for (const profile of this.#profilesStore.list)
				counts.profiles[profile.id] =
					passingOtherThanScope - (counts.profiles[profile.id] ?? 0);
		return counts;
	}

	private sectionsOf(mod: Mod): Record<FilterSection, boolean> {
		return {
			scope: this.isInScope(mod, this.scope, this.scopeProfile),
			sources:
				!this.sources.length ||
				this.sources.some((source) => source === mod.source),
			states:
				!this.states.length ||
				this.states.some((state) => this.isInState(mod, state)),
			tagIds:
				!this.tagIds.length ||
				this.#libraryStore
					.tagsOf(mod)
					.some((tag) => this.tagIds.includes(tag.id)),
		};
	}

	private isInScope(
		mod: Mod,
		scope: LibraryScope,
		profile: Profile | null
	): boolean {
		switch (scope) {
			case 'all':
				return true;
			case 'has':
				return this.#libraryStore.isInProfile(mod, profile);
			case 'lacks':
				return !this.#libraryStore.isInProfile(mod, profile);
		}
	}

	private isInState(mod: Mod, state: ModState): boolean {
		switch (state) {
			case 'in-no-profile':
				return this.#libraryStore.isUnused(mod);
			case 'update-available':
				return mod.hasUnseenUpdate;
			case 'missing-or-broken':
				return mod.problem !== null;
		}
	}

	private static isLibrarySource(source: ModSource): source is LibrarySource {
		return LIBRARY_SOURCES.some(
			(librarySource) => librarySource === source
		);
	}

	private static unique<T>(values: readonly T[]): T[] {
		return values.filter((value, index) => values.indexOf(value) === index);
	}

	private static toggled<T>(values: readonly T[], value: T): T[] {
		return values.includes(value)
			? values.filter((chosen) => chosen !== value)
			: [...values, value];
	}
}
