export class Selection<Key> {
	readonly #order: () => readonly Key[];
	#anchor: Key | null = null;

	keys = $state.raw<readonly Key[]>([]);

	constructor(order: () => readonly Key[]) {
		this.#order = order;
	}

	readonly isAll = $derived.by(
		() => this.keys.length > 0 && this.keys.length === this.#order().length
	);
	readonly isSome = $derived.by(() => this.keys.length > 0 && !this.isAll);

	has(key: Key): boolean {
		return this.keys.includes(key);
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
			this.keys = order.slice(Math.min(from, to), Math.max(from, to) + 1);
			return;
		}
		this.keys = [key];
		this.#anchor = key;
	}

	toggle(key: Key): void {
		this.keys = this.has(key)
			? this.keys.filter((selected) => selected !== key)
			: [...this.keys, key];
		this.#anchor = key;
	}

	toggleAll(): void {
		this.keys = this.isAll ? [] : [...this.#order()];
	}

	clear(): void {
		this.keys = [];
		this.#anchor = null;
	}
}
