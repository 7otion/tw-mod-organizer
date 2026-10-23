import { SvelteSet } from 'svelte/reactivity';

import type { Selection } from '@/lib/selection.svelte';
import type { VirtualList } from '@/lib/virtual-list.svelte';

import {
	DragSession,
	type DragHost,
	type DragPayload,
	type Point,
} from './drag-session.svelte';

export type DropLine = {
	index: number;
	top: number;
	left: number;
	width: number;
	count: number;
};

export type Ghost<Row> = {
	row: Row;
	count: number;
	width: number;
	height: number;
	grabOffset: Point;
};

export type Lift = {
	top: number;
	offsets: Record<number, number>;
};

export type RowDragOptions = {
	hasHandle?: boolean;
	reorder?(keys: readonly number[]): Promise<unknown>;
	accepts?(payload: DragPayload): boolean;
	insert?(payload: DragPayload, index: number): Promise<readonly number[]>;
	onDropped?(landed: boolean): void;
	unitOf?(key: number): readonly number[] | null;
	canReorder?(): boolean;
};

export type DragTable<Row> = {
	readonly rows: readonly Row[];
	readonly keys: readonly number[];
	readonly baseKeys: readonly number[];
	readonly rowHeight: number;
	readonly lineInset: number;
	readonly selection: Selection<number> | null;
	readonly viewport: HTMLElement | null;
	readonly virtualList: VirtualList;
	keyOf(row: Row): number;
	rowByKey(key: number): Row | null;
	heightOf(row: Row): number;
};

type Slot = {
	key: number;
	mid: number;
};

type Block = {
	keys: readonly number[];
	offsets: Record<number, number>;
	height: number;
	grabbedOffset: number;
	above: Slot[];
	below: Slot[];
};

const FLASH_MS = 1200;
const PREVIEW_FALLBACK_MS = 400;
const EDGE_ZONE = 48;
const MAX_SCROLL_STEP = 16;

export class RowDrag<Row> implements DragHost {
	readonly #table: DragTable<Row>;
	readonly #options: RowDragOptions;
	readonly #session = DragSession.current;
	readonly #lifted = new SvelteSet<number>();

	readonly hasHandle: boolean;

	#payload: DragPayload | null = null;
	#viewportRect: DOMRect | null = null;
	#lastPoint: Point | null = null;
	#velocity = 0;
	#block: Block | null = null;

	preview = $state.raw<readonly number[] | null>(null);
	dropLine = $state.raw<DropLine | null>(null);
	ghost = $state.raw<Ghost<Row> | null>(null);
	lift = $state.raw<Lift | null>(null);
	#flashed = $state.raw<readonly number[]>([]);

	constructor(table: DragTable<Row>, options: RowDragOptions) {
		this.#table = table;
		this.#options = options;
		this.hasHandle = options.hasHandle ?? true;
		this.#session.register(this);
		$effect(() => () => this.#session.unregister(this));
		$effect(() => {
			if (
				this.preview &&
				!this.isSource &&
				RowDrag.sameOrder(this.#table.baseKeys, this.preview)
			)
				this.preview = null;
		});
	}

	readonly isSource = $derived.by(
		() => this.#session.active?.source === this
	);

	get point(): Point {
		return this.#session.point;
	}

	keysFor(key: number): number[] {
		const selection = this.#table.selection;
		const heads = selection?.has(key)
			? this.#table.keys.filter((candidate) => selection.has(candidate))
			: [key];
		return heads.flatMap((head) => this.unitOf(head) ?? []);
	}

	unitOf(key: number): readonly number[] | null {
		return this.#options.unitOf ? this.#options.unitOf(key) : [key];
	}

	isLifted(key: number): boolean {
		return this.#lifted.has(key);
	}

	liftTopOf(key: number): number | null {
		const lift = this.lift;
		if (!lift || !(key in lift.offsets)) return null;
		return lift.top + lift.offsets[key];
	}

	isFlashed(key: number): boolean {
		return this.#flashed.includes(key);
	}

	arm(event: PointerEvent): void {
		const target = event.target as Element | null;
		const rowElement = target?.closest<HTMLElement>('[data-row]');
		if (!rowElement || rowElement.hasAttribute('data-disabled')) return;
		if (this.hasHandle && !target?.closest('[data-handle]')) return;
		if (this.#options.canReorder?.() === false) return;
		const grabbed = Number(rowElement.dataset.row);
		if (this.unitOf(grabbed) === null) return;
		const rect = rowElement.getBoundingClientRect();
		this.#session.arm(event, (origin) =>
			this.payloadFor(
				this.keysFor(grabbed),
				grabbed,
				origin,
				rect.top,
				rect.height
			)
		);
	}

	armStack(event: PointerEvent, keys: readonly number[]): void {
		if (!keys.length) return;
		this.#session.arm(event, (origin) =>
			this.payloadFor(
				keys,
				keys[0],
				origin,
				origin.y - this.#table.rowHeight / 2
			)
		);
	}

	begin(payload: DragPayload): void {
		this.#payload = payload;
		this.#viewportRect =
			this.#table.viewport?.getBoundingClientRect() ?? null;
		this.#velocity = 0;
		if (payload.source !== this) return;
		for (const key of payload.keys) this.#lifted.add(key);
		if (this.#options.reorder) this.liftBlock(payload);
		else this.showGhost(payload);
	}

	track(point: Point): void {
		const payload = this.#payload;
		const rect = this.#viewportRect;
		const viewport = this.#table.viewport;
		if (!payload || !rect || !viewport) return;
		this.#lastPoint = point;
		if (payload.source === this) {
			if (this.#block) this.follow(payload, point, rect, viewport);
			return;
		}
		if (!this.accepts(payload)) return;
		const inside =
			point.x >= rect.left &&
			point.x <= rect.right &&
			point.y >= rect.top &&
			point.y <= rect.bottom &&
			RowDrag.isTopmost(viewport, point);
		this.#velocity = inside ? RowDrag.edgeVelocity(rect, point.y) : 0;
		if (!inside) {
			this.dropLine = null;
			return;
		}
		const scrollTop = viewport.scrollTop;
		this.dropLine = this.lineAt(
			this.slotAt(point.y - rect.top + scrollTop),
			rect,
			scrollTop,
			payload.keys.length
		);
	}

	tick(): void {
		const viewport = this.#table.viewport;
		if (!this.#velocity || !viewport || !this.#lastPoint) return;
		viewport.scrollTop += this.#velocity;
		this.track(this.#lastPoint);
	}

	async drop(payload: DragPayload): Promise<boolean> {
		this.#payload = null;
		this.#velocity = 0;
		if (payload.source === this) {
			this.#lifted.clear();
			const block = this.#block;
			this.#block = null;
			this.lift = null;
			const order = this.preview;
			if (
				!block ||
				!order ||
				!this.#options.reorder ||
				RowDrag.sameOrder(order, this.#table.baseKeys)
			) {
				this.preview = null;
				return false;
			}
			try {
				await this.#options.reorder(order);
			} catch (error) {
				this.preview = null;
				throw error;
			}
			setTimeout(() => {
				if (!this.isSource) this.preview = null;
			}, PREVIEW_FALLBACK_MS);
			return true;
		}
		const line = this.dropLine;
		this.dropLine = null;
		if (!line || !this.#options.insert || !this.accepts(payload))
			return false;
		const added = await this.#options.insert(payload, line.index);
		this.flash(added);
		return added.length > 0;
	}

	cancel(): void {
		this.#payload = null;
		this.#velocity = 0;
		this.#lifted.clear();
		this.#block = null;
		this.lift = null;
		this.preview = null;
		this.dropLine = null;
		this.ghost = null;
	}

	settle(landed: boolean): void {
		this.#options.onDropped?.(landed);
		this.ghost = null;
	}

	private accepts(payload: DragPayload): boolean {
		return this.#options.accepts?.(payload) ?? false;
	}

	private liftBlock(payload: DragPayload): void {
		const table = this.#table;
		const offsets: Record<number, number> = {};
		let height = 0;
		for (const key of payload.keys) {
			offsets[key] = height;
			height += table.heightOf(table.rowByKey(key)!);
		}
		const above: Slot[] = [];
		const below: Slot[] = [];
		let start = table.virtualList.paddingStart;
		let grabbedTop = start;
		let isBelow = false;
		for (const key of table.baseKeys) {
			const rowHeight = table.heightOf(table.rowByKey(key)!);
			if (key === payload.grabbed) {
				grabbedTop = start;
				isBelow = true;
			} else if (!this.#lifted.has(key))
				(isBelow ? below : above).push({
					key,
					mid: start + rowHeight / 2,
				});
			start += rowHeight;
		}
		const grabbedOffset = offsets[payload.grabbed];
		this.#block = {
			keys: payload.keys,
			offsets,
			height,
			grabbedOffset,
			above,
			below,
		};
		this.placeBlock(grabbedTop - grabbedOffset);
	}

	private follow(
		payload: DragPayload,
		point: Point,
		rect: DOMRect,
		viewport: HTMLElement
	): void {
		this.#velocity = RowDrag.edgeVelocity(rect, point.y);
		const top =
			point.y -
			rect.top +
			viewport.scrollTop -
			payload.grabOffset.y -
			this.#block!.grabbedOffset;
		this.placeBlock(top);
	}

	private placeBlock(top: number): void {
		const block = this.#block!;
		this.lift = { top, offsets: block.offsets };
		let at = 0;
		for (const slot of block.above) if (slot.mid <= top) at++;
		for (const slot of block.below) if (slot.mid < top + block.height) at++;
		const others = [...block.above, ...block.below].map((slot) => slot.key);
		const next = [
			...others.slice(0, at),
			...block.keys,
			...others.slice(at),
		];
		if (!this.preview || !RowDrag.sameOrder(next, this.preview))
			this.preview = next;
	}

	private showGhost(payload: DragPayload): void {
		const row = this.#table.rowByKey(payload.grabbed);
		this.ghost = row
			? {
					row,
					count: payload.keys.length,
					width: payload.width,
					height: payload.height,
					grabOffset: payload.grabOffset,
				}
			: null;
	}

	private payloadFor(
		keys: readonly number[],
		grabbed: number,
		origin: Point,
		rowTop: number,
		height = this.#table.rowHeight
	): DragPayload | null {
		const viewport = this.#table.viewport;
		if (!viewport) return null;
		const rect = viewport.getBoundingClientRect();
		return {
			source: this,
			keys,
			grabbed,
			grabOffset: { x: origin.x - rect.left, y: origin.y - rowTop },
			width: rect.width,
			height,
		};
	}

	private slotAt(offset: number): number {
		const item = this.#table.virtualList.itemAtOffset(offset);
		if (!item) return 0;
		return offset >= item.start + item.size / 2
			? item.index + 1
			: item.index;
	}

	private lineAt(
		slot: number,
		rect: DOMRect,
		scrollTop: number,
		count: number
	): DropLine {
		const inset = this.#table.lineInset;
		const top = this.#table.virtualList.offsetOf(slot);
		return {
			index: slot,
			top: Math.min(
				rect.bottom,
				Math.max(rect.top, rect.top + top - scrollTop)
			),
			left: rect.left + inset,
			width: rect.width - inset * 2,
			count,
		};
	}

	private flash(keys: readonly number[]): void {
		if (!keys.length) return;
		this.#flashed = [...this.#flashed, ...keys];
		setTimeout(() => {
			this.#flashed = this.#flashed.filter((key) => !keys.includes(key));
		}, FLASH_MS);
	}

	private static sameOrder(
		a: readonly number[],
		b: readonly number[]
	): boolean {
		return (
			a.length === b.length && a.every((key, index) => key === b[index])
		);
	}

	private static isTopmost(viewport: HTMLElement, point: Point): boolean {
		const hit = document.elementFromPoint(point.x, point.y);
		return hit !== null && viewport.contains(hit);
	}

	private static edgeVelocity(rect: DOMRect, y: number): number {
		const step = (distance: number) =>
			Math.min(
				MAX_SCROLL_STEP,
				Math.ceil((distance / EDGE_ZONE) * MAX_SCROLL_STEP)
			);
		if (y < rect.top + EDGE_ZONE) return -step(rect.top + EDGE_ZONE - y);
		if (y > rect.bottom - EDGE_ZONE)
			return step(y - (rect.bottom - EDGE_ZONE));
		return 0;
	}
}
