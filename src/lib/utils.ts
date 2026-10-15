import { toast } from 'svelte-sonner';
export { cn } from "cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

const REFUSED_ARGUMENT = /^invalid args `[^`]*` for command `[^`]*`: /;
export function toastError(error: unknown): void {
	toast.error('Error', {
		description: String(error).replace(REFUSED_ARGUMENT, ''),
	});
	console.error(error);
}
