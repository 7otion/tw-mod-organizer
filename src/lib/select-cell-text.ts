export function selectCellText(event: MouseEvent): void {
	if (!(event.target instanceof Element)) return;
	const cell = event.target.closest<HTMLElement>('[data-cell]');
	if (!cell) return;
	cell.style.userSelect = 'text';
	window.getSelection()?.selectAllChildren(cell);
	window.addEventListener(
		'mousedown',
		() => {
			cell.style.userSelect = '';
		},
		{ once: true, capture: true }
	);
}
