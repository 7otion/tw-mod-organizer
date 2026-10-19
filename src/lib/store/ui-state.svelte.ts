import { ConnectionStore } from '@7otion-tauri/orm';

import { UiState } from '@/lib/models';

type UiStateValue = string | number | boolean | null;

export type UiStateField<T extends UiStateValue> = {
	key: string;
	initial: T;
	is: (value: UiStateValue) => value is T;
};

export class UiStateStore extends ConnectionStore {
	readonly #rows = this.query(() => UiState.query());

	readonly isLoaded = $derived(this.#rows.loaded);

	get<T extends UiStateValue>(field: UiStateField<T>): T {
		const row = this.#rows.rows.find((row) => row.key === field.key);
		const value = row ? UiStateStore.parse(row.value) : undefined;
		return value !== undefined && field.is(value) ? value : field.initial;
	}

	async set<T extends UiStateValue>(
		field: UiStateField<T>,
		value: T
	): Promise<void> {
		await UiState.updateOrCreate(
			{ key: field.key },
			{ value: JSON.stringify(value) }
		);
	}

	private static parse(stored: string): UiStateValue | undefined {
		try {
			const value: unknown = JSON.parse(stored);
			return value === null ||
				['string', 'number', 'boolean'].includes(typeof value)
				? (value as UiStateValue)
				: undefined;
		} catch {
			return undefined;
		}
	}
}
