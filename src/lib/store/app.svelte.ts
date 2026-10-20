import { Store } from '@7otion-tauri/orm';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';

export class AppStore extends Store {
	isMaximized = $state(false);
	version = $state('');
	isInstallingMod = $state(false);
	installPath = $state<string | null>(null);

	constructor() {
		super();
		void getVersion().then((version) => (this.version = version));
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

	openInstallMod(path: string | null = null): void {
		this.installPath = path;
		this.isInstallingMod = true;
	}
}
