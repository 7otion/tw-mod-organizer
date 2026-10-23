import { createCn } from 'cn/config';
import { toast } from 'svelte-sonner';

import { t } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/message-key';

export const cn = createCn({
	extend: {
		theme: {
			spacing: [
				'titlebar',
				'rail',
				'sidebar',
				'row-compact',
				'row-regular',
				'row-large',
				'row-sep',
				'thumb-compact',
				'thumb-regular',
				'thumb-large',
				'thumb-huge',
			],
			radius: ['shell', 'window'],
		},
		classGroups: {
			'font-size': [{ text: ['3xs', '2xs', 'md', 'title'] }],
			shadow: [{ shadow: ['pop', 'modal'] }],
			'bg-image': [{ bg: ['fade-black'] }],
		},
	},
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
	? Omit<T, 'children'>
	: T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

export function oneOf<T extends string>(
	values: readonly T[],
	label: string
): (value: T) => T {
	return (value) => {
		if (!values.includes(value))
			throw new Error(`"${value}" is not a valid ${label}.`);
		return value;
	};
}

export type NameKind = 'tag' | 'profile' | 'group' | 'mod' | 'separator';

export function nameError(
	kind: NameKind,
	name: string,
	isTaken: boolean
): MessageKey | null {
	if (!name.trim()) return `names.${kind}.empty`;
	if (isTaken) return `names.${kind}.taken`;
	return null;
}

export function unixNow(): number {
	return Math.floor(Date.now() / 1000);
}

const REFUSED_ARGUMENT = /^invalid args `[^`]*` for command `[^`]*`: /;
export function toastError(error: unknown): void {
	toast.error(t('common.error'), {
		description: String(error).replace(REFUSED_ARGUMENT, ''),
	});
	console.error(error);
}
