import type { LucideIcon } from '@lucide/svelte';
import DownloadIcon from '@lucide/svelte/icons/download';
import Layers2Icon from '@lucide/svelte/icons/layers-2';
import LibraryIcon from '@lucide/svelte/icons/library';
import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
import SaveIcon from '@lucide/svelte/icons/save';

import type { MessageKey } from '@/lib/i18n/message-key';

export type NavRoute = {
	id: 'load-order' | 'library' | 'groups' | 'saves' | 'downloads';
	path: string;
	labelKey: MessageKey;
	shortcutKey: string;
	icon: LucideIcon;
};

export const navRoutes: NavRoute[] = [
	{
		id: 'load-order',
		path: '/load-order',
		labelKey: 'nav.loadOrder',
		shortcutKey: '1',
		icon: ListOrderedIcon,
	},
	{
		id: 'library',
		path: '/library',
		labelKey: 'nav.library',
		shortcutKey: '2',
		icon: LibraryIcon,
	},
	{
		id: 'groups',
		path: '/groups',
		labelKey: 'nav.groups',
		shortcutKey: '3',
		icon: Layers2Icon,
	},
	{
		id: 'saves',
		path: '/load-order',
		labelKey: 'nav.saves',
		shortcutKey: '4',
		icon: SaveIcon,
	},
	{
		id: 'downloads',
		path: '/load-order',
		labelKey: 'nav.downloads',
		shortcutKey: '5',
		icon: DownloadIcon,
	},
];
