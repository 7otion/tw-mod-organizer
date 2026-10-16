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
				'thumb-regular-w',
				'thumb-regular-h',
				'thumb-large-w',
				'thumb-large-h',
			],
			radius: ['window'],
		},
		classGroups: {
			'font-size': [{ text: ['3xs', '2xs', 'md', 'title'] }],
			shadow: [{ shadow: ['focus-ring', 'pop', 'modal', 'seal'] }],
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

const REFUSED_ARGUMENT = /^invalid args `[^`]*` for command `[^`]*`: /;
export function toastError(error: unknown): void {
	toast.error('Error', {
		description: String(error).replace(REFUSED_ARGUMENT, ''),
	});
	console.error(error);
}
