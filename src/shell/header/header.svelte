<script lang="ts">
	import GameSelector from './game-selector.svelte';
	import HeaderActions from './header-actions.svelte';
	import WindowActions from './window-actions.svelte';
</script>

<header
	class="app-drag-region flex h-titlebar shrink-0 items-stretch gap-3 border-b [border-image:linear-gradient(to_right,var(--line)_10%,transparent_60%,color-mix(in_oklab,var(--pink)_20%,transparent))_1]"
>
	<div class="-mr-3 grid w-rail shrink-0 place-items-center border-r">
		<img src="/logo.png" alt="TW Mod Organizer" class="size-8" />
	</div>
	<GameSelector />
	<HeaderActions />
	<WindowActions />
</header>
