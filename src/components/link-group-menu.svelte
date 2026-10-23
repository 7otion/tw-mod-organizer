<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';

	import { Button } from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import { t } from '@/lib/i18n';
	import { GroupsStore, LoadOrderStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	let { class: className }: { class?: string } = $props();

	const groupsStore = GroupsStore.get();
	const loadOrderStore = LoadOrderStore.get();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="secondary" class={className}>
				<LayersIcon class="size-3.5" />
				{t('header.loadOrder.linkGroup')}
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" class="min-w-52">
		{#each loadOrderStore.unlinkedGroups as group (group.id)}
			<DropdownMenu.Item onSelect={() => loadOrderStore.linkGroup(group)}>
				<span
					class="size-2 shrink-0 rounded-full"
					style:background-color={tagColor(group.color)}
				></span>
				{group.name}
				<span class="ml-auto font-mono text-xs text-muted-foreground">
					{groupsStore.memberCount(group)}
				</span>
			</DropdownMenu.Item>
		{:else}
			<DropdownMenu.Item disabled>
				{groupsStore.list.length
					? t('header.loadOrder.linkGroupAllLinked')
					: t('header.loadOrder.linkGroupNone')}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
