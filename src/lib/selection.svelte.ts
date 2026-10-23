import { SvelteSet } from 'svelte/reactivity';

export class Selection<Key> {
	readonly #order: () => readonly Key[];
	readonly #keys = new SvelteSet<Key>();
	#anchor: Key | null = null;
	#cursor = $state<Key | null>(null);

	constructor(order: () => readonly Key[]) {
		this.#order = order;
	}

	readonly isAll = $derived.by(() => {
		const order = this.#order();
		return order.length > 0 && order.every((key) => this.#keys.has(key));
	});
	readonly isSome = $derived.by(() => this.#keys.size > 0 && !this.isAll);
	readonly only = $derived.by((): Key | null => {
		if (this.#keys.size !== 1) return null;
		const [key] = this.#keys;
		return key;
	});

	get count(): number {
		return this.#keys.size;
	}

	get cursor(): Key | null {
		return this.#cursor;
	}

	has(key: Key): boolean {
		return this.#keys.has(key);
	}

	select(key: Key, event: MouseEvent): void {
		if (event.ctrlKey || event.metaKey) {
			this.toggle(key);
			return;
		}
		const order = this.#order();
		if (
			event.shiftKey &&
			this.#anchor !== null &&
			order.includes(this.#anchor)
		) {
			const [from, to] = [
				order.indexOf(this.#anchor),
				order.indexOf(key),
			];
			this.replace(
				order.slice(Math.min(from, to), Math.max(from, to) + 1)
			);
			this.#cursor = key;
			return;
		}
		this.replace([key]);
		this.#anchor = key;
		this.#cursor = key;
	}

	step(direction: 1 | -1, isExtending: boolean): void {
		const order = this.#order();
		if (!order.length) return;
		const at = this.#cursor === null ? -1 : order.indexOf(this.#cursor);
		const index =
			at === -1
				? direction === 1
					? 0
					: order.length - 1
				: Math.min(order.length - 1, Math.max(0, at + direction));
		const key = order[index];
		if (isExtending) {
			this.#keys.add(key);
		} else {
			this.replace([key]);
			this.#anchor = key;
		}
		this.#cursor = key;
	}

	toggle(key: Key): void {
		if (!this.#keys.delete(key)) this.#keys.add(key);
		this.#anchor = key;
		this.#cursor = key;
	}

	delete(key: Key): void {
		this.#keys.delete(key);
	}

	retain(keys: readonly Key[]): void {
		for (const key of this.#keys)
			if (!keys.includes(key)) this.#keys.delete(key);
		if (this.#anchor !== null && !this.#keys.has(this.#anchor))
			this.#anchor = null;
		if (this.#cursor !== null && !this.#keys.has(this.#cursor))
			this.#cursor = null;
	}

	selectAll(): void {
		for (const key of this.#order()) this.#keys.add(key);
	}

	toggleAll(): void {
		const order = this.#order();
		if (this.isAll) {
			for (const key of order) this.#keys.delete(key);
			return;
		}
		for (const key of order) this.#keys.add(key);
	}

	clear(): void {
		this.#keys.clear();
		this.#anchor = null;
		this.#cursor = null;
	}

	private replace(keys: readonly Key[]): void {
		this.#keys.clear();
		for (const key of keys) this.#keys.add(key);
	}
}
