<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	import SidebarHeading from './sidebar-heading.svelte';
	import SidebarItem from './sidebar-item.svelte';

	const PROFILES = [
		{ name: 'Chaos campaign', modCount: 118, isActive: true },
		{ name: 'Multiplayer clean', modCount: 42, isActive: false },
		{ name: 'Lore-friendly', modCount: 203, isActive: false },
		{ name: 'Testing', modCount: 12, isActive: false },
	];
</script>

<div class="flex flex-col pt-4 pb-1.5">
	<SidebarHeading title="PROFILES" tooltip="New profile (Ctrl+Shift+P)">
		<PlusIcon class="size-3.5" />
		New
	</SidebarHeading>
	<ul class="flex flex-col gap-px">
		{#each PROFILES as profile (profile.name)}
			<SidebarItem
				name={profile.name}
				count={profile.modCount}
				active={profile.isActive}
			>
				{#snippet marker()}
					{#if profile.isActive}
						<span
							class="size-[7px] shrink-0 rotate-45 bg-primary shadow-[0_0_6px_rgba(255,77,148,0.6)]"
						></span>
					{:else}
						<span
							class="size-[7px] shrink-0 rotate-45 border border-muted-foreground"
						></span>
					{/if}
				{/snippet}
			</SidebarItem>
		{/each}
	</ul>
</div>
