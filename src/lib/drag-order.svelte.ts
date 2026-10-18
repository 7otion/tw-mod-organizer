import type { UniqueIdentifier } from '@dnd-kit/abstract';
import { move } from '@dnd-kit/helpers';

type DragEvent = Parameters<typeof move>[1];

export class DragOrder<Item, Key extends UniqueIdentifier> {
	readonly #source: () => readonly Item[];
	readonly #keyOf: (item: Item) => Key;
	readonly #save: (keys: Key[]) => Promise<unknown>;

	#dragged = $state.raw<Key[] | null>(null);

	constructor(
		source: () => readonly Item[],
		keyOf: (item: Item) => Key,
		save: (keys: Key[]) => Promise<unknown>
	) {
		this.#source = source;
		this.#keyOf = keyOf;
		this.#save = save;
	}

	readonly items = $derived.by((): readonly Item[] => {
		const items = this.#source();
		if (!this.#dragged) return items;
		return this.#dragged.flatMap(
			(key) => items.find((item) => this.#keyOf(item) === key) ?? []
		);
	});

	over(event: DragEvent): void {
		this.#dragged = move(this.items.map(this.#keyOf), event);
	}

	async end(canceled: boolean): Promise<void> {
		const dragged = this.#dragged;
		if (canceled || !dragged) {
			this.#dragged = null;
			return;
		}
		try {
			await this.#save(dragged);
		} finally {
			this.#dragged = null;
		}
	}
}
