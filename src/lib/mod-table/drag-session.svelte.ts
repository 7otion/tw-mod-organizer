export type Point = {
	x: number;
	y: number;
};

export type DragPayload = {
	source: DragHost;
	keys: readonly number[];
	grabbed: number;
	grabOffset: Point;
	width: number;
	height: number;
};

export interface DragHost {
	begin(payload: DragPayload): void;
	track(point: Point): void;
	tick(): void;
	drop(payload: DragPayload): Promise<boolean>;
	cancel(): void;
	settle(landed: boolean): void;
}

const ACTIVATION_DISTANCE = 4;
const CLICK_SUPPRESSION_MS = 50;

export class DragSession {
	static readonly current = new DragSession();

	#hosts: DragHost[] = [];
	#teardown: (() => void) | null = null;

	active = $state.raw<DragPayload | null>(null);
	point = $state.raw<Point>({ x: 0, y: 0 });

	register(host: DragHost): void {
		this.#hosts = [...this.#hosts, host];
	}

	unregister(host: DragHost): void {
		this.#hosts = this.#hosts.filter((known) => known !== host);
	}

	arm(
		event: PointerEvent,
		start: (origin: Point) => DragPayload | null
	): void {
		if (event.button !== 0 || this.active) return;
		const origin = { x: event.clientX, y: event.clientY };
		const move = (moved: PointerEvent) => {
			const point = { x: moved.clientX, y: moved.clientY };
			if (
				Math.hypot(point.x - origin.x, point.y - origin.y) <
				ACTIVATION_DISTANCE
			)
				return;
			disarm();
			const payload = start(origin);
			if (payload) this.begin(payload, point);
		};
		const disarm = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', disarm);
			window.removeEventListener('pointercancel', disarm);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', disarm);
		window.addEventListener('pointercancel', disarm);
	}

	private begin(payload: DragPayload, point: Point): void {
		this.active = payload;
		this.point = point;
		const move = (event: PointerEvent) => {
			this.point = { x: event.clientX, y: event.clientY };
			this.track();
		};
		const up = () => void this.finish(false);
		const cancel = () => void this.finish(true);
		const keydown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			event.stopImmediatePropagation();
			void this.finish(true);
		};
		const loop = () => {
			for (const host of this.#hosts) host.tick();
			frame = requestAnimationFrame(loop);
		};
		let frame = requestAnimationFrame(loop);
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', cancel);
		window.addEventListener('blur', cancel);
		window.addEventListener('keydown', keydown, true);
		document.body.style.cursor = 'grabbing';
		this.#teardown = () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', cancel);
			window.removeEventListener('blur', cancel);
			window.removeEventListener('keydown', keydown, true);
			document.body.style.cursor = '';
		};
		for (const host of this.#hosts) host.begin(payload);
		this.track();
	}

	private track(): void {
		for (const host of this.#hosts) host.track(this.point);
	}

	private async finish(canceled: boolean): Promise<void> {
		const payload = this.active;
		if (!payload) return;
		this.#teardown?.();
		this.#teardown = null;
		this.active = null;
		DragSession.suppressNextClick();
		if (canceled) {
			for (const host of this.#hosts) host.cancel();
			payload.source.settle(false);
			return;
		}
		let landed = false;
		for (const host of this.#hosts)
			if (await host.drop(payload)) landed = true;
		payload.source.settle(landed);
	}

	private static suppressNextClick(): void {
		const swallow = (event: MouseEvent) => {
			event.stopPropagation();
			event.preventDefault();
		};
		window.addEventListener('click', swallow, {
			capture: true,
			once: true,
		});
		setTimeout(
			() =>
				window.removeEventListener('click', swallow, { capture: true }),
			CLICK_SUPPRESSION_MS
		);
	}
}
