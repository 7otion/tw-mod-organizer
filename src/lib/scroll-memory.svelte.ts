import { tick, untrack } from 'svelte';

import type { VirtualList } from '@/lib/virtual-list.svelte';

export type ScrollMemoryOptions<Key> = {
	list: VirtualList;
	viewport: () => HTMLElement | null;
	key: () => Key | null;
	saved: () => number | null;
	hasRows: () => boolean;
	isFiltered: () => boolean;
	save: (key: Key, offset: number) => void;
	saveDelay?: number;
};

type ScrollPosition<Key> = {
	key: Key;
	offset: number;
};

const DEFAULT_SAVE_DELAY = 250;

export class ScrollMemory<Key> {
	readonly #options: ScrollMemoryOptions<Key>;
	#restoredKey: Key | null = null;
	#unfiltered: ScrollPosition<Key> | null = null;
	#pending: ScrollPosition<Key> | null = null;
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(options: ScrollMemoryOptions<Key>) {
		this.#options = options;

		$effect(() => {
			const key = options.key();
			const saved = options.saved();
			if (
				key === null ||
				this.#restoredKey === key ||
				saved === null ||
				!options.viewport() ||
				!options.hasRows() ||
				options.isFiltered()
			)
				return;
			this.#restoredKey = key;
			this.#unfiltered = { key, offset: saved };
			this.scrollTo(saved);
		});

		$effect(() => {
			if (options.isFiltered()) return;
			untrack(() => {
				const position = this.#unfiltered;
				if (position && position.key === options.key())
					this.scrollTo(position.offset);
			});
		});

		$effect(() => () => {
			clearTimeout(this.#timer);
			this.save();
		});
	}

	remember(offset: number): void {
		const options = this.#options;
		const key = options.key();
		if (key === null || this.#restoredKey !== key || options.isFiltered())
			return;
		clearTimeout(this.#timer);
		const rounded = Math.round(offset);
		this.#unfiltered = { key, offset: rounded };
		this.#pending = rounded === options.saved() ? null : this.#unfiltered;
		if (this.#pending !== null)
			this.#timer = setTimeout(
				() => this.save(),
				options.saveDelay ?? DEFAULT_SAVE_DELAY
			);
	}

	private scrollTo(offset: number): void {
		void tick().then(() => {
			if (this.#options.viewport())
				this.#options.list.scrollToOffset(offset);
		});
	}

	private save(): void {
		if (this.#pending === null) return;
		const { key, offset } = this.#pending;
		this.#pending = null;
		this.#options.save(key, offset);
	}
}
