export type Licence = { name: string; licence: string };

export const LICENCES: { group: string; items: Licence[] }[] = [
	{
		group: 'Interface',
		items: [
			{ name: 'Svelte', licence: 'MIT' },
			{ name: 'SvelteKit', licence: 'MIT' },
			{ name: 'bits-ui', licence: 'MIT' },
			{ name: 'shadcn-svelte', licence: 'MIT' },
			{ name: 'Tailwind CSS', licence: 'MIT' },
			{ name: 'tailwind-variants', licence: 'MIT' },
			{ name: 'tw-animate-css', licence: 'MIT' },
			{ name: 'cn', licence: 'MIT' },
			{ name: 'Lucide', licence: 'ISC' },
			{ name: 'svelte-sonner', licence: 'MIT' },
			{ name: 'mode-watcher', licence: 'MIT' },
			{ name: 'paneforge', licence: 'MIT' },
			{ name: 'Embla Carousel', licence: 'MIT' },
			{ name: '@internationalized/date', licence: 'Apache-2.0' },
			{ name: 'dnd kit', licence: 'MIT' },
			{ name: '7otion-tauri', licence: 'MIT' },
		],
	},
	{
		group: 'Backend',
		items: [
			{ name: 'Tauri and its plugins', licence: 'MIT or Apache-2.0' },
			{ name: 'SQLx', licence: 'MIT or Apache-2.0' },
			{ name: 'reqwest', licence: 'MIT or Apache-2.0' },
			{ name: 'Serde', licence: 'MIT or Apache-2.0' },
			{ name: 'thiserror', licence: 'MIT or Apache-2.0' },
			{ name: 'fs4', licence: 'MIT or Apache-2.0' },
			{ name: 'tracing', licence: 'MIT' },
			{ name: 'trash', licence: 'MIT' },
		],
	},
	{
		group: 'Fonts',
		items: [
			{ name: 'Cinzel', licence: 'OFL-1.1' },
			{ name: 'Grenze Gotisch', licence: 'OFL-1.1' },
		],
	},
	{
		group: 'Steam',
		items: [
			{ name: 's7forge', licence: 'MIT' },
			{
				name: 'Steamworks runtime (steam_api64.dll)',
				licence: 'Valve Corporation',
			},
		],
	},
];
