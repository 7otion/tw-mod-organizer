import { goto } from '$app/navigation';
import { page } from '$app/state';
import { Store } from '@7otion-tauri/orm';
import { untrack } from 'svelte';

import { navRoutes } from '@/lib/nav-routes';

import { UiStateStore, type UiStateField } from './ui-state.svelte';

export class NavigationStore extends Store {
	private static readonly lastPageField: UiStateField<string> = {
		key: 'app.last_page',
		initial: '/library',
		is: (value): value is string =>
			navRoutes.some((route) => route.path === value),
	};

	readonly #uiStateStore = UiStateStore.get();

	constructor() {
		super();
		$effect(() => {
			const path = page.url.pathname;
			if (!NavigationStore.lastPageField.is(path)) return;
			untrack(
				() =>
					void this.#uiStateStore.set(
						NavigationStore.lastPageField,
						path
					)
			);
		});
		$effect(() => {
			if (!this.#uiStateStore.isLoaded || page.url.pathname !== '/')
				return;
			const last = untrack(() =>
				this.#uiStateStore.get(NavigationStore.lastPageField)
			);
			void goto(last, { replaceState: true });
		});
	}
}
