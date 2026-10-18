<script lang="ts">
	import WindowActions from './window-actions.svelte';
</script>

<header
	class="app-drag-region flex h-titlebar shrink-0 items-stretch border-b border-line"
>
	<div class="grid w-rail shrink-0 place-items-center border-r border-line">
		<img src="/logo.png" alt="TW Mod Organizer" class="size-8" />
	</div>
	<span class="flex items-center px-4 text-xs font-bold">
		TW Mod Organizer
	</span>
	<WindowActions />
</header>
