import { Database, Model } from '@7otion-tauri/orm';

export const ssr = false;

Model.connect(
	new Database({
		path: 'twmodorganizer_v2.db',
		migrations: 'app',
		loggerEnabled: import.meta.env.DEV,
	})
);
