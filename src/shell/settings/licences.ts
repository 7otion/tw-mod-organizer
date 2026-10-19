import type { MessageKey } from '@/lib/i18n/message-key';

export type Licence = { name: string; licence: string };

export const LICENCES: { group: MessageKey; items: Licence[] }[] = [
	{
		group: 'settings.licences.groups.interface',
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
			{ name: 'TanStack Virtual', licence: 'MIT' },
			{ name: '7otion-tauri', licence: 'MIT' },
		],
	},
	{
		group: 'settings.licences.groups.backend',
		items: [
			{ name: 'Tauri and its plugins', licence: 'MIT or Apache-2.0' },
			{ name: 'SQLx', licence: 'MIT or Apache-2.0' },
			{ name: 'reqwest', licence: 'MIT or Apache-2.0' },
			{ name: 'Serde', licence: 'MIT or Apache-2.0' },
			{ name: 'thiserror', licence: 'MIT or Apache-2.0' },
			{ name: 'toml', licence: 'MIT or Apache-2.0' },
			{ name: 'fs4', licence: 'MIT or Apache-2.0' },
			{ name: 'image', licence: 'MIT or Apache-2.0' },
			{ name: 'fast_image_resize', licence: 'MIT or Apache-2.0' },
			{ name: 'tracing', licence: 'MIT' },
			{ name: 'trash', licence: 'MIT' },
		],
	},
	{
		group: 'settings.licences.groups.fonts',
		items: [
			{ name: 'Grenze Gotisch', licence: 'OFL-1.1' },
			{ name: 'Cinzel', licence: 'OFL-1.1' },
			{ name: 'Macondo', licence: 'OFL-1.1' },
		],
	},
	{
		group: 'settings.licences.groups.steam',
		items: [
			{ name: 's7forge', licence: 'MIT' },
			{
				name: 'Steamworks runtime (steam_api64.dll)',
				licence: 'Valve Corporation',
			},
		],
	},
];
