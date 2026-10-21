import {
	ARROW_UP_DOWN,
	CIRCLE_ALERT,
	CIRCLE_ARROW_UP,
	REFRESH_CW,
	UNLINK,
	ZAP,
	type IconNode,
} from '@/lib/mod-table/row-icons.svelte';

export const NOTICE_CATEGORIES = [
	'missing',
	'broken',
	'order',
	'nexus',
	'steam',
	'conflict',
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_GROUPS = ['action', 'know'] as const;
export type NoticeGroup = (typeof NOTICE_GROUPS)[number];

export type NoticeScope = 'library' | 'profile';

export type NoticeCategorySpec = {
	group: NoticeGroup;
	scope: NoticeScope;
	icon: IconNode;
	color: string;
	isCounted: boolean;
	isPlanned: boolean;
};

export const NOTICE_CATEGORY_SPECS: Record<NoticeCategory, NoticeCategorySpec> =
	{
		missing: {
			group: 'action',
			scope: 'library',
			icon: UNLINK,
			color: 'var(--st-missing)',
			isCounted: true,
			isPlanned: false,
		},
		broken: {
			group: 'action',
			scope: 'library',
			icon: CIRCLE_ALERT,
			color: 'var(--st-missing)',
			isCounted: true,
			isPlanned: false,
		},
		order: {
			group: 'action',
			scope: 'profile',
			icon: ARROW_UP_DOWN,
			color: 'var(--st-lose)',
			isCounted: true,
			isPlanned: false,
		},
		nexus: {
			group: 'action',
			scope: 'library',
			icon: CIRCLE_ARROW_UP,
			color: 'var(--st-dep)',
			isCounted: true,
			isPlanned: true,
		},
		steam: {
			group: 'know',
			scope: 'library',
			icon: REFRESH_CW,
			color: 'var(--st-update)',
			isCounted: false,
			isPlanned: false,
		},
		conflict: {
			group: 'know',
			scope: 'profile',
			icon: ZAP,
			color: 'var(--st-warn)',
			isCounted: false,
			isPlanned: true,
		},
	};

export function categoriesIn(group: NoticeGroup): NoticeCategory[] {
	return NOTICE_CATEGORIES.filter(
		(category) => NOTICE_CATEGORY_SPECS[category].group === group
	);
}
