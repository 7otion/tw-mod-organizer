<script lang="ts" module>
	import { CHECK, MINUS, icon } from './row-icons.svelte';

	export type EnableBoxState = boolean | 'mixed';

	export { enableBox };
</script>

{#snippet enableBox(
	state: EnableBoxState,
	label: string,
	onclick: (event: MouseEvent) => void
)}
	<button
		type="button"
		role="checkbox"
		aria-checked={state === 'mixed' ? 'mixed' : state}
		aria-label={label}
		class={[
			'grid size-4 cursor-pointer place-items-center rounded-[5px] outline-0 transition-[background-color,box-shadow] duration-120',
			state === false
				? 'shadow-[inset_0_0_0_1.5px_var(--text-4)] hover:shadow-[inset_0_0_0_1.5px_var(--text-3)]'
				: 'bg-foreground text-background',
		]}
		{onclick}
		ondblclick={(event) => event.stopPropagation()}
	>
		{#if state === true}
			{@render icon(CHECK, 'size-3')}
		{:else if state === 'mixed'}
			{@render icon(MINUS, 'size-3')}
		{/if}
	</button>
{/snippet}
