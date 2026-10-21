import { SvelteSet } from 'svelte/reactivity';

import type { Mod } from '@/lib/models';
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
	index: number;
	count: number;
	width: number;
	height: number;
	grabOffset: Point;
	lockedX: number | null;
	settle: Point | null;
};

export type RowDragOptions = {
	hasHandle?: boolean;
	reorder?(keys: readonly number[]): Promise<unknown>;
	accepts?(payload: DragPayload): boolean;
	insert?(payload: DragPayload, index: number): Promise<readonly number[]>;
	onDropped?(landed: boolean): void;
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
	modOf(row: Row): Mod;
	rowByKey(key: number): Row | null;
};

const FLASH_MS = 1200;
const SETTLE_MS = 150;
const PREVIEW_FALLBACK_MS = 400;
const LIST_PADDING = 4;
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

	preview = $state.raw<readonly number[] | null>(null);
	dropLine = $state.raw<DropLine | null>(null);
	ghost = $state.raw<Ghost<Row> | null>(null);
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
		if (selection?.has(key))
			return this.#table.keys.filter((candidate) =>
				selection.has(candidate)
			);
		return [key];
	}

	isLifted(key: number): boolean {
		return this.#lifted.has(key);
	}

	isFlashed(key: number): boolean {
		return this.#flashed.includes(key);
	}

	arm(event: PointerEvent): void {
		const target = event.target as Element | null;
		const rowElement = target?.closest<HTMLElement>('[data-row]');
		if (!rowElement || rowElement.hasAttribute('data-disabled')) return;
		if (this.hasHandle && !target?.closest('[data-handle]')) return;
		const grabbed = Number(rowElement.dataset.row);
		const rowTop = rowElement.getBoundingClientRect().top;
		this.#session.arm(event, (origin) =>
			this.payloadFor(this.keysFor(grabbed), grabbed, origin, rowTop)
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
		this.#lifted.add(payload.grabbed);
		const row = this.#table.rowByKey(payload.grabbed);
		this.ghost = row
			? {
					row,
					index: this.#table.keys.indexOf(payload.grabbed),
					count: payload.keys.length,
					width: payload.width,
					height: payload.height,
					grabOffset: payload.grabOffset,
					lockedX: this.#options.reorder
						? (this.#viewportRect?.left ?? null)
						: null,
					settle: null,
				}
			: null;
	}

	track(point: Point): void {
		const payload = this.#payload;
		const rect = this.#viewportRect;
		const viewport = this.#table.viewport;
		if (!payload || !rect || !viewport || !this.accepts(payload)) return;
		this.#lastPoint = point;
		const own = payload.source === this;
		const inside =
			point.x >= rect.left &&
			point.x <= rect.right &&
			point.y >= rect.top &&
			point.y <= rect.bottom &&
			RowDrag.isTopmost(viewport, point);
		this.#velocity = inside ? RowDrag.edgeVelocity(rect, point.y) : 0;
		if (!inside) {
			if (!own) this.dropLine = null;
			return;
		}
		const scrollTop = viewport.scrollTop;
		if (own) {
			const center = point.y - payload.grabOffset.y + payload.height / 2;
			this.previewAt(
				this.slotNearest(center - rect.top + scrollTop, payload.grabbed)
			);
			return;
		}
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
			const preview = this.preview;
			this.#lifted.clear();
			const order = preview ? RowDrag.landed(preview, payload) : null;
			if (
				!order ||
				!this.#options.reorder ||
				RowDrag.sameOrder(order, this.#table.baseKeys)
			) {
				this.preview = null;
				return false;
			}
			this.preview = order;
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
		this.preview = null;
		this.dropLine = null;
		this.ghost = null;
	}

	settle(landed: boolean): void {
		this.#options.onDropped?.(landed);
		const ghost = this.ghost;
		if (!ghost) return;
		const target =
			landed && this.#options.reorder
				? this.placeholderPoint(ghost)
				: null;
		if (!target) {
			this.ghost = null;
			return;
		}
		this.ghost = { ...ghost, settle: target };
		setTimeout(() => {
			this.ghost = null;
		}, SETTLE_MS);
	}

	private accepts(payload: DragPayload): boolean {
		if (payload.source === this) return this.#options.reorder !== undefined;
		return this.#options.accepts?.(payload) ?? false;
	}

	private payloadFor(
		keys: readonly number[],
		grabbed: number,
		origin: Point,
		rowTop: number
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
			height: this.#table.rowHeight,
		};
	}

	private slotAt(offset: number): number {
		const item = this.#table.virtualList.itemAtOffset(offset);
		if (!item) return 0;
		return offset >= item.start + item.size / 2
			? item.index + 1
			: item.index;
	}

	private slotNearest(center: number, grabbed: number): number {
		const height = this.#table.rowHeight;
		const count = this.#table.keys.length;
		const nearest = Math.min(
			count - 1,
			Math.max(
				0,
				Math.round((center - LIST_PADDING - height / 2) / height)
			)
		);
		const current = this.#table.keys.indexOf(grabbed);
		return nearest >= current ? nearest + 1 : nearest;
	}

	private previewAt(slot: number): void {
		const current = this.#table.keys;
		const lifted = current.filter((key) => this.#lifted.has(key));
		const rest = current.filter((key) => !this.#lifted.has(key));
		const at = current
			.slice(0, slot)
			.filter((key) => !this.#lifted.has(key)).length;
		const next = [...rest.slice(0, at), ...lifted, ...rest.slice(at)];
		if (!RowDrag.sameOrder(next, current)) this.preview = next;
	}

	private lineAt(
		slot: number,
		rect: DOMRect,
		scrollTop: number,
		count: number
	): DropLine {
		const inset = this.#table.lineInset;
		const top = LIST_PADDING + slot * this.#table.rowHeight;
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

	private placeholderPoint(ghost: Ghost<Row>): Point | null {
		const viewport = this.#table.viewport;
		if (!viewport) return null;
		const key = this.#table.keyOf(ghost.row);
		const row = viewport.querySelector<HTMLElement>(`[data-row="${key}"]`);
		if (!row) return null;
		return {
			x: viewport.getBoundingClientRect().left,
			y: row.getBoundingClientRect().top,
		};
	}

	private flash(keys: readonly number[]): void {
		if (!keys.length) return;
		this.#flashed = [...this.#flashed, ...keys];
		setTimeout(() => {
			this.#flashed = this.#flashed.filter((key) => !keys.includes(key));
		}, FLASH_MS);
	}

	private static landed(
		preview: readonly number[],
		payload: DragPayload
	): number[] {
		const selected = Object.fromEntries(
			payload.keys.map((key) => [key, true])
		) as Record<number, true>;
		const rest = preview.filter((key) => !(key in selected));
		const at = preview
			.slice(0, preview.indexOf(payload.grabbed))
			.filter((key) => !(key in selected)).length;
		return [...rest.slice(0, at), ...payload.keys, ...rest.slice(at)];
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
		if (y < rect.top + EDGE_ZONE)
			return -Math.ceil(
				((rect.top + EDGE_ZONE - y) / EDGE_ZONE) * MAX_SCROLL_STEP
			);
		if (y > rect.bottom - EDGE_ZONE)
			return Math.ceil(
				((y - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE) * MAX_SCROLL_STEP
			);
		return 0;
	}
}
