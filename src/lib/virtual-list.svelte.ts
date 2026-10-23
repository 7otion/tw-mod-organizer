import {
	elementScroll,
	observeElementOffset,
	observeElementRect,
	type VirtualItem,
	Virtualizer,
	type VirtualizerOptions,
} from '@tanstack/virtual-core';
import { untrack } from 'svelte';

export type VirtualListOptions = {
	count: () => number;
	scrollElement: () => HTMLElement | null;
	itemSize: (index: number) => number;
	itemKey: (index: number) => string | number;
	sizeKey?: () => unknown;
	paddingStart?: number;
	paddingEnd?: number;
	endInset?: () => number;
	overscan?: () => number;
	onScroll?: (offset: number) => void;
};

const DEFAULT_OVERSCAN = 8;

export class VirtualList {
	readonly #options: VirtualListOptions;
	readonly #virtualizer: Virtualizer<HTMLElement, HTMLElement>;

	items = $state.raw<VirtualItem[]>([]);
	totalSize = $state(0);

	constructor(options: VirtualListOptions) {
		this.#options = options;
		this.#virtualizer = new Virtualizer(this.virtualizerOptions());

		$effect(() => {
			if (!options.scrollElement()) return;
			return untrack(() => {
				const unmount = this.#virtualizer._didMount();
				this.#virtualizer.scrollOffset = null;
				this.#virtualizer.scrollRect = null;
				this.#virtualizer._willUpdate();
				this.refresh();
				return unmount;
			});
		});

		$effect(() => {
			options.count();
			options.scrollElement();
			options.endInset?.();
			options.overscan?.();
			untrack(() => {
				this.#virtualizer.setOptions(this.virtualizerOptions());
				this.#virtualizer._willUpdate();
				this.refresh();
			});
		});

		$effect(() => {
			options.sizeKey?.();
			untrack(() => {
				this.#virtualizer.measure();
				this.refresh();
			});
		});
	}

	get paddingStart(): number {
		return this.#options.paddingStart ?? 0;
	}

	scrollToIndex(index: number): void {
		this.#virtualizer.scrollToIndex(index, { align: 'auto' });
	}

	scrollToOffset(offset: number): void {
		this.#virtualizer.scrollToOffset(offset);
	}

	itemAtOffset(offset: number): VirtualItem | undefined {
		return this.#virtualizer.getVirtualItemForOffset(offset);
	}

	offsetOf(index: number): number {
		const measurements = this.#virtualizer.measurementsCache;
		const item = measurements[index];
		if (item) return item.start;
		const last = measurements.at(-1);
		return last ? last.end : (this.#options.paddingStart ?? 0);
	}

	private refresh(): void {
		this.items = this.#virtualizer.getVirtualItems();
		this.totalSize = this.#virtualizer.getTotalSize();
	}

	private virtualizerOptions(): VirtualizerOptions<HTMLElement, HTMLElement> {
		const options = this.#options;
		return {
			count: options.count(),
			getScrollElement: options.scrollElement,
			estimateSize: options.itemSize,
			getItemKey: options.itemKey,
			paddingStart: options.paddingStart ?? 0,
			paddingEnd: options.paddingEnd ?? 0,
			scrollPaddingStart: options.paddingStart ?? 0,
			scrollPaddingEnd:
				(options.paddingEnd ?? 0) + (options.endInset?.() ?? 0),
			overscan: options.overscan?.() ?? DEFAULT_OVERSCAN,
			scrollToFn: elementScroll,
			observeElementRect,
			observeElementOffset: (instance, callback) =>
				observeElementOffset(instance, (offset, isScrolling) => {
					callback(offset, isScrolling);
					options.onScroll?.(instance.scrollOffset ?? offset);
				}),
			onChange: () => this.refresh(),
		};
	}
}
