import { SvelteSet } from 'svelte/reactivity';

export class Selection<Key> {
	readonly #order: () => readonly Key[];
	readonly #keys = new SvelteSet<Key>();
	#anchor: Key | null = null;

	constructor(order: () => readonly Key[]) {
		this.#order = order;
	}

	readonly isAll = $derived.by(() => {
		const order = this.#order();
		return order.length > 0 && order.every((key) => this.#keys.has(key));
	});
	readonly isSome = $derived.by(() => this.#keys.size > 0 && !this.isAll);

	get count(): number {
		return this.#keys.size;
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
			return;
		}
		this.replace([key]);
		this.#anchor = key;
	}

	toggle(key: Key): void {
		if (!this.#keys.delete(key)) this.#keys.add(key);
		this.#anchor = key;
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
	}

	private replace(keys: readonly Key[]): void {
		this.#keys.clear();
		for (const key of keys) this.#keys.add(key);
	}
}
