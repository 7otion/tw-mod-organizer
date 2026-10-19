import type { LucideIcon } from '@lucide/svelte';
import DownloadIcon from '@lucide/svelte/icons/download';
import LayersIcon from '@lucide/svelte/icons/layers';
import LibraryIcon from '@lucide/svelte/icons/library';
import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
import SaveIcon from '@lucide/svelte/icons/save';

export type NavRoute = {
	path: string;
	label: string;
	shortcut: string;
	icon: LucideIcon;
};

export const navRoutes: NavRoute[] = [
	{
		path: '/',
		label: 'Load order',
		shortcut: 'Ctrl+1',
		icon: ListOrderedIcon,
	},
	{
		path: '/library',
		label: 'Library',
		shortcut: 'Ctrl+2',
		icon: LibraryIcon,
	},
	{ path: '/', label: 'Groups', shortcut: 'Ctrl+3', icon: LayersIcon },
	{ path: '/', label: 'Saves', shortcut: 'Ctrl+4', icon: SaveIcon },
	{ path: '/', label: 'Downloads', shortcut: 'Ctrl+5', icon: DownloadIcon },
];
