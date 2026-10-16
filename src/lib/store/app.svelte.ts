import { Store } from '@7otion-tauri/orm';
import { getCurrentWindow } from '@tauri-apps/api/window';

export class AppStore extends Store {
	isMaximized = $state(false);

	constructor() {
		super();
		$effect(() => {
			const appWindow = getCurrentWindow();
			let resizeTimer: ReturnType<typeof setTimeout> | undefined;
			const sync = async () => {
				this.isMaximized = await appWindow.isMaximized();
			};
			const unlisten = appWindow.onResized(() => {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(sync, 150);
			});
			void sync();
			return () => {
				clearTimeout(resizeTimer);
				void unlisten.then((off) => off());
			};
		});
	}
}
