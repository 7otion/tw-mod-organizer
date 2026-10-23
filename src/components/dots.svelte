<script lang="ts" module>
	export { activeDot };
</script>

{#snippet activeDot(isActive: boolean)}
	<span
		class={[
			'size-2 shrink-0 rounded-full',
			isActive ? 'bg-pink' : 'shadow-[inset_0_0_0_1.5px_var(--text-4)]',
		]}
	></span>
{/snippet}
