import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules')
						? undefined
						: true,
			},
			adapter: adapter({ fallback: 'index.html' }),
			alias: {
				'@': 'src',
				'@7otion-tauri/orm': '../7otion-tauri/orm/api/src/index.ts',
			},
		}),
	],
	resolve: {
		dedupe: ['svelte', '@tauri-apps/api'],
	},
	clearScreen: false,
	server: {
		fs: {
			allow: ['../7otion-tauri/orm/api/src'],
		},
		port: 2222,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 2223,
				}
			: undefined,
		watch: {
			ignored: ['**/src-tauri/**'],
		},
	},
});
