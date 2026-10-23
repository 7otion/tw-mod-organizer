<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';

	import { t } from '@/lib/i18n';
	import { LoadOrderStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	import SidebarCount from './sidebar-count.svelte';
	import SidebarHeadingAction from './sidebar-heading-action.svelte';
	import SidebarHeading from './sidebar-heading.svelte';
	import SidebarItem from './sidebar-item.svelte';

	const loadOrderStore = LoadOrderStore.get();

	const hasExpanded = $derived(
		loadOrderStore.outline.some((row) => !row.entry.collapsed)
	);
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden pt-4 pb-1.5">
	<SidebarHeading title={t('sidebar.outline.title')}>
		{#if hasExpanded}
			<SidebarHeadingAction
				tooltip={t('sidebar.outline.collapseAllTooltip')}
				onclick={() => loadOrderStore.collapseAll()}
			>
				{t('sidebar.outline.collapseAll')}
			</SidebarHeadingAction>
		{/if}
	</SidebarHeading>
	<div class="min-h-0 flex-1 overflow-y-auto">
		<ul class="flex flex-col gap-px">
			{#each loadOrderStore.outline as row (row.key)}
				<SidebarItem onclick={() => loadOrderStore.scrollTo(row)}>
					{#if row.kind === 'group'}
						<LayersIcon
							class="size-3.5 shrink-0"
							style="color: {tagColor(row.group.color)}"
						/>
						<span class="min-w-0 flex-1 truncate"
							>{row.group.name}</span
						>
						<SidebarCount
							value="{row.enabledCount}/{row.members.length}"
						/>
					{:else}
						<span
							class="size-2 shrink-0 rotate-45"
							style:background-color={tagColor(
								row.separator.background_color
							)}
						></span>
						<span class="min-w-0 flex-1 truncate">
							{row.separator.title}
						</span>
						<SidebarCount value={row.mods.length} />
					{/if}
				</SidebarItem>
			{:else}
				<li class="px-4 text-sm text-muted-foreground">
					{t('sidebar.outline.empty')}
				</li>
			{/each}
		</ul>
	</div>
</div>
