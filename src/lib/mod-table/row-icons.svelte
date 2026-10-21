<script lang="ts" module>
	export type IconNode = readonly (readonly [
		tag: string,
		attributes: Record<string, string>,
	])[];

	export const CIRCLE_ALERT: IconNode = [
		['circle', { cx: '12', cy: '12', r: '10' }],
		['line', { x1: '12', x2: '12', y1: '8', y2: '12' }],
		['line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }],
	];
	export const CIRCLE_ARROW_UP: IconNode = [
		['circle', { cx: '12', cy: '12', r: '10' }],
		['path', { d: 'm16 12-4-4-4 4' }],
		['path', { d: 'M12 16V8' }],
	];
	export const LINK: IconNode = [
		[
			'path',
			{
				d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
			},
		],
		[
			'path',
			{
				d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
			},
		],
	];
	export const PANEL_RIGHT_OPEN: IconNode = [
		['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }],
		['path', { d: 'M15 3v18' }],
		['path', { d: 'm10 15-3-3 3-3' }],
	];
	export const PUZZLE: IconNode = [
		[
			'path',
			{
				d: 'M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z',
			},
		],
	];
	export const UNLINK: IconNode = [
		[
			'path',
			{
				d: 'm18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71',
			},
		],
		[
			'path',
			{
				d: 'm5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71',
			},
		],
		['line', { x1: '8', x2: '8', y1: '2', y2: '5' }],
		['line', { x1: '2', x2: '5', y1: '8', y2: '8' }],
		['line', { x1: '16', x2: '16', y1: '19', y2: '22' }],
		['line', { x1: '19', x2: '22', y1: '16', y2: '16' }],
	];
	export const GRIP_VERTICAL: IconNode = [
		['circle', { cx: '9', cy: '12', r: '1' }],
		['circle', { cx: '9', cy: '5', r: '1' }],
		['circle', { cx: '9', cy: '19', r: '1' }],
		['circle', { cx: '15', cy: '12', r: '1' }],
		['circle', { cx: '15', cy: '5', r: '1' }],
		['circle', { cx: '15', cy: '19', r: '1' }],
	];
	export const X: IconNode = [
		['path', { d: 'M18 6 6 18' }],
		['path', { d: 'm6 6 12 12' }],
	];
	export const CHECK: IconNode = [['path', { d: 'M20 6 9 17l-5-5' }]];
	export const DIAMOND: IconNode = [
		[
			'path',
			{
				d: 'M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z',
			},
		],
	];
	export const FOLDER: IconNode = [
		[
			'path',
			{
				d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
			},
		],
	];

	export const IMAGE_OFF: IconNode = [
		['line', { x1: '2', x2: '22', y1: '2', y2: '22' }],
		['path', { d: 'M10.41 10.41a2 2 0 1 1-2.83-2.83' }],
		['line', { x1: '13.5', x2: '6', y1: '13.5', y2: '21' }],
		['line', { x1: '18', x2: '21', y1: '12', y2: '15' }],
		[
			'path',
			{
				d: 'M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59',
			},
		],
		['path', { d: 'M21 15V5a2 2 0 0 0-2-2H9' }],
	];

	export { icon };
</script>

{#snippet icon(node: IconNode, className: string, label?: string)}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={label ? undefined : 'true'}
		aria-label={label}
		role={label ? 'img' : undefined}
		class={className}
	>
		{#each node as [tag, attributes], position (position)}
			<svelte:element this={tag} {...attributes} />
		{/each}
	</svg>
{/snippet}
