<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';

	import { cn } from '@/lib/utils';

	import SidebarHeading from './sidebar-heading.svelte';
	import SidebarItem from './sidebar-item.svelte';

	type SeparatorColor =
		| 'grey'
		| 'red'
		| 'purple'
		| 'green'
		| 'blue'
		| 'amber'
		| 'teal'
		| 'rust';

	type OutlineEntry =
		| {
				type: 'separator';
				name: string;
				color: SeparatorColor;
				modCount: number;
		  }
		| {
				type: 'group';
				name: string;
				enabledCount: number;
				memberCount: number;
		  };

	const SEPARATOR_SWATCHES: Record<SeparatorColor, string> = {
		grey: 'bg-sep-grey',
		red: 'bg-sep-red',
		purple: 'bg-sep-purple',
		green: 'bg-sep-green',
		blue: 'bg-sep-blue',
		amber: 'bg-sep-amber',
		teal: 'bg-sep-teal',
		rust: 'bg-sep-rust',
	};

	const OUTLINE: OutlineEntry[] = [
		{ type: 'separator', name: 'Frameworks', color: 'grey', modCount: 2 },
		{
			type: 'group',
			name: 'UI essentials',
			enabledCount: 6,
			memberCount: 7,
		},
		{ type: 'separator', name: 'Overhauls', color: 'red', modCount: 2 },
		{
			type: 'separator',
			name: 'Factions & Lords',
			color: 'purple',
			modCount: 34,
		},
		{ type: 'separator', name: 'Units', color: 'green', modCount: 5 },
		{ type: 'separator', name: 'Graphics', color: 'blue', modCount: 2 },
		{
			type: 'separator',
			name: 'Campaign & AI',
			color: 'amber',
			modCount: 27,
		},
		{ type: 'separator', name: 'Maps', color: 'teal', modCount: 9 },
		{
			type: 'separator',
			name: 'Compatibility patches',
			color: 'rust',
			modCount: 19,
		},
	];
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden pt-4 pb-1.5">
	<SidebarHeading
		title="OUTLINE"
		tooltip="Collapse all separators (Ctrl+Shift+[)"
	>
		Collapse all
	</SidebarHeading>
	<ul class="flex flex-col gap-px">
		{#each OUTLINE as entry (entry.name)}
			<SidebarItem
				name={entry.name}
				count={entry.type === 'group'
					? `${entry.enabledCount}/${entry.memberCount}`
					: entry.modCount}
			>
				{#snippet marker()}
					{#if entry.type === 'group'}
						<LayersIcon
							class="size-3.5 shrink-0 text-pink-strong"
						/>
					{:else}
						<span
							class={cn(
								'size-2 shrink-0 rotate-45',
								SEPARATOR_SWATCHES[entry.color]
							)}
						></span>
					{/if}
				{/snippet}
			</SidebarItem>
		{/each}
	</ul>
</div>
