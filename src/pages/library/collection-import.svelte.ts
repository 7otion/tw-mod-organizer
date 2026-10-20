import { invoke } from '@tauri-apps/api/core';
import { SvelteSet } from 'svelte/reactivity';

import type { Mod } from '@/lib/models';
import { parseWorkshopId } from '@/lib/steam-links';
import {
	GamesStore,
	GroupsStore,
	LibraryStore,
	WorkshopDownloadsStore,
} from '@/lib/store';

export type CollectionItem = {
	source_ref: string;
	title: string;
	size_bytes: number;
	preview_url: string | null;
	is_subscribed: boolean;
	kind: 'mod' | 'collection' | 'other_game';
};

export type Collection = {
	source_ref: string;
	title: string;
	author_name: string;
	author_ref: string;
	preview_url: string | null;
	updated_at: number;
	items: CollectionItem[];
};

export type ItemStatus =
	'new' | 'skipped' | 'inLibrary' | 'collection' | 'otherGame';

export type CollectionRow = {
	item: CollectionItem;
	status: ItemStatus;
};

export type ImportError = {
	kind: 'invalidLink' | 'notCollection' | 'notFound' | 'other';
	detail: string;
};

const SELECTABLE: readonly ItemStatus[] = ['new', 'skipped'];

export class CollectionImport {
	readonly #gamesStore = GamesStore.get();
	readonly #libraryStore = LibraryStore.get();
	readonly #downloadsStore = WorkshopDownloadsStore.get();
	readonly #groupsStore = GroupsStore.get();
	readonly #skipped = new SvelteSet<string>();

	link = $state('');
	isLoading = $state(false);
	isSubscribing = $state(false);
	error = $state.raw<ImportError | null>(null);
	collection = $state.raw<Collection | null>(null);

	readonly rows = $derived(
		(this.collection?.items ?? []).map((item): CollectionRow => ({
			item,
			status: this.statusOf(item),
		}))
	);
	readonly selectable = $derived(
		this.rows.filter((row) => SELECTABLE.includes(row.status))
	);
	readonly ticked = $derived(this.rows.filter((row) => row.status === 'new'));
	readonly inLibraryCount = $derived(
		this.rows.filter((row) => row.status === 'inLibrary').length
	);
	readonly tickedBytes = $derived(
		this.ticked.reduce((sum, row) => sum + row.item.size_bytes, 0)
	);
	readonly isAllTicked = $derived(
		this.selectable.length > 0 &&
			this.ticked.length === this.selectable.length
	);
	readonly isSomeTicked = $derived(
		this.ticked.length > 0 && this.ticked.length < this.selectable.length
	);

	statusOf(item: CollectionItem): ItemStatus {
		if (item.kind === 'collection') return 'collection';
		if (item.kind === 'other_game') return 'otherGame';
		if (
			item.is_subscribed ||
			this.#libraryStore.hasSteamMod(item.source_ref)
		)
			return 'inLibrary';
		return this.#skipped.has(item.source_ref) ? 'skipped' : 'new';
	}

	toggle(item: CollectionItem): void {
		if (this.#skipped.has(item.source_ref))
			this.#skipped.delete(item.source_ref);
		else this.#skipped.add(item.source_ref);
	}

	toggleAll(): void {
		if (this.isAllTicked)
			for (const row of this.selectable)
				this.#skipped.add(row.item.source_ref);
		else this.#skipped.clear();
	}

	async load(): Promise<void> {
		const collectionId = parseWorkshopId(this.link);
		if (collectionId === null) {
			this.error = { kind: 'invalidLink', detail: '' };
			return;
		}
		this.isLoading = true;
		this.error = null;
		this.collection = null;
		this.#skipped.clear();
		try {
			this.collection = await invoke<Collection>('fetch_collection', {
				app_id: this.#gamesStore.current!.app_id,
				collection_id: Number(collectionId),
			});
		} catch (error) {
			this.error = CollectionImport.errorOf(error);
		} finally {
			this.isLoading = false;
		}
	}

	async subscribe(createGroup: boolean): Promise<void> {
		const collection = this.collection!;
		const items = this.ticked.map((row) => ({
			source_ref: row.item.source_ref,
			title: row.item.title,
		}));
		if (!items.length) return;
		const memberRefs = this.rows
			.filter((row) => row.status === 'new' || row.status === 'inLibrary')
			.map((row) => row.item.source_ref);
		this.isSubscribing = true;
		try {
			await this.#downloadsStore.subscribe(items);
			if (createGroup) await this.createGroup(collection, memberRefs);
			this.reset();
		} finally {
			this.isSubscribing = false;
		}
	}

	private async createGroup(
		collection: Collection,
		refs: readonly string[]
	): Promise<void> {
		const byRef = Object.fromEntries(
			this.#libraryStore.list
				.filter((mod) => mod.source === 'steam')
				.map((mod) => [mod.source_ref, mod])
		) as Record<string, Mod | undefined>;
		const mods = refs.flatMap((ref) => byRef[ref] ?? []);
		let name = collection.title;
		for (let number = 2; this.#groupsStore.isNameTaken(name); number++)
			name = `${collection.title} (${number})`;
		await this.#groupsStore.create(name, mods, {
			steamCollectionId: collection.source_ref,
		});
	}

	reset(): void {
		this.link = '';
		this.error = null;
		this.collection = null;
		this.#skipped.clear();
	}

	private static errorOf(error: unknown): ImportError {
		const detail = String(error);
		if (detail.includes('not a collection'))
			return { kind: 'notCollection', detail };
		if (detail.includes('not found')) return { kind: 'notFound', detail };
		return { kind: 'other', detail };
	}
}
