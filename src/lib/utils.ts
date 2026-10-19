import { createCn } from 'cn/config';
import { toast } from 'svelte-sonner';

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

export function nameError(
	kind: string,
	name: string,
	isTaken: boolean
): string | null {
	if (!name.trim()) return `A ${kind} needs a name.`;
	if (isTaken) return `A ${kind} with this name already exists.`;
	return null;
}

export function unixNow(): number {
	return Math.floor(Date.now() / 1000);
}

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 31_536_000],
	['month', 2_592_000],
	['week', 604_800],
	['day', 86_400],
	['hour', 3_600],
	['minute', 60],
];
const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(date: Date): string {
	const seconds = (Date.now() - date.getTime()) / 1000;
	const unit = TIME_UNITS.find(([, size]) => seconds >= size);
	if (!unit) return 'just now';
	return relativeTime.format(-Math.floor(seconds / unit[1]), unit[0]);
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
export function formatSize(bytes: number): string {
	let size = bytes;
	let unit = 0;
	while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
		size /= 1024;
		unit++;
	}
	const digits = unit > 0 && size < 10 ? 1 : 0;
	return `${size.toFixed(digits)} ${SIZE_UNITS[unit]}`;
}

export function shortDate(date: Date): string {
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year:
			date.getFullYear() === new Date().getFullYear()
				? undefined
				: 'numeric',
	});
}

const REFUSED_ARGUMENT = /^invalid args `[^`]*` for command `[^`]*`: /;
export function toastError(error: unknown): void {
	toast.error('Error', {
		description: String(error).replace(REFUSED_ARGUMENT, ''),
	});
	console.error(error);
}
