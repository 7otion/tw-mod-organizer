const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const MAX_KEY_LENGTH = 50;

export type Keyed<Id> = {
	id: Id;
	key: string;
};

export function keyBetween(a: string | null, b: string | null): string {
	if (a !== null && b !== null && a >= b)
		throw new Error(`"${a}" is not before "${b}"`);
	return midpoint(a ?? '', b);
}

export function keysBetween(
	a: string | null,
	b: string | null,
	count: number
): string[] {
	const keys: string[] = [];
	let previous = a;
	for (let index = 0; index < count; index++) {
		previous = keyBetween(previous, b);
		keys.push(previous);
	}
	return keys;
}

export function spreadKeys(count: number): string[] {
	if (!Number.isInteger(count) || count < 0)
		throw new RangeError('count must be a non-negative integer');
	if (count === 0) return [];
	const base = DIGITS.length;
	let digits = 1;
	while (base ** digits <= count) digits++;
	const space = base ** digits;
	const keys: string[] = [];
	for (let index = 0; index < count; index++) {
		let value = Math.round(((index + 1) * space) / (count + 1));
		let key = '';
		for (let place = 0; place < digits; place++) {
			key = DIGITS[value % base] + key;
			value = Math.floor(value / base);
		}
		keys.push(key.replace(/0+$/, '') || DIGITS[1]);
	}
	return keys;
}

export function rekeyOrder<Id>(ordered: readonly Keyed<Id>[]): Map<Id, string> {
	const changes = new Map<Id, string>();
	if (ordered.some((item) => item.key.length > MAX_KEY_LENGTH)) {
		const keys = spreadKeys(ordered.length);
		ordered.forEach((item, index) => changes.set(item.id, keys[index]));
		return changes;
	}
	const kept = longestIncreasingRun(ordered.map((item) => item.key));
	let previous: string | null = null;
	let index = 0;
	while (index < ordered.length) {
		if (kept.has(index)) {
			previous = ordered[index].key;
			index++;
			continue;
		}
		let end = index;
		while (end < ordered.length && !kept.has(end)) end++;
		const next = end < ordered.length ? ordered[end].key : null;
		const keys = keysBetween(previous, next, end - index);
		for (let offset = 0; offset < keys.length; offset++)
			changes.set(ordered[index + offset].id, keys[offset]);
		previous = keys.at(-1) ?? previous;
		index = end;
	}
	return changes;
}

function longestIncreasingRun(keys: readonly string[]): Set<number> {
	const tails: number[] = [];
	const previous = keys.map(() => -1);
	for (let index = 0; index < keys.length; index++) {
		let low = 0;
		let high = tails.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (keys[tails[middle]] < keys[index]) low = middle + 1;
			else high = middle;
		}
		previous[index] = low > 0 ? tails[low - 1] : -1;
		tails[low] = index;
	}
	const kept = new Set<number>();
	for (let index = tails.at(-1) ?? -1; index >= 0; index = previous[index])
		kept.add(index);
	return kept;
}

function midpoint(a: string, b: string | null): string {
	if (b !== null && a >= b) throw new Error(`"${a}" is not before "${b}"`);
	if (a.endsWith('0') || b?.endsWith('0'))
		throw new Error('position keys never end in 0');
	if (b !== null) {
		let shared = 0;
		while ((a[shared] ?? '0') === b[shared]) shared++;
		if (shared > 0)
			return (
				b.slice(0, shared) + midpoint(a.slice(shared), b.slice(shared))
			);
	}
	const digitA = a ? DIGITS.indexOf(a[0]) : 0;
	const digitB = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
	if (digitB - digitA > 1) return DIGITS[Math.round(0.5 * (digitA + digitB))];
	if (b !== null && b.length > 1) return b.slice(0, 1);
	return DIGITS[digitA] + midpoint(a.slice(1), null);
}
