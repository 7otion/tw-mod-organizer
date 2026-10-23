<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import Layers2Icon from '@lucide/svelte/icons/layers-2';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import {
		Button,
		type ButtonSize,
		type ButtonVariant,
	} from '@/components/ui/button';
	import * as DropdownMenu from '@/components/ui/dropdown-menu';

	import NewGroupDialog from '@/shell/sidebar/new-group-dialog.svelte';

	import { t } from '@/lib/i18n';
	import type { Mod } from '@/lib/models';
	import { GroupsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';

	type Props = {
		mods: readonly Mod[];
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
	};

	let {
		mods,
		variant = 'ghost',
		size = 'sm',
		class: className,
	}: Props = $props();

	const groupsStore = GroupsStore.get();

	let isCreating = $state(false);

	function countIn(groupId: number): number {
		const group = groupsStore.list.find((group) => group.id === groupId)!;
		return mods.filter((mod) => groupsStore.isMember(group, mod)).length;
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} {variant} {size} class={className}>
				<Layers2Icon />
				{t('library.bulk.addToGroup')}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" class="min-w-52">
		{#each groupsStore.list as group (group.id)}
			{@const count = countIn(group.id)}
			<DropdownMenu.CheckboxItem
				checked={count > 0 && count === mods.length}
				indeterminate={count > 0 && count < mods.length}
				onCheckedChange={(isChecked) =>
					groupsStore.setMembership(group, mods, isChecked)}
			>
				<span
					class="size-2 shrink-0 rounded-full"
					style:background-color={tagColor(group.color)}
				></span>
				{group.name}
			</DropdownMenu.CheckboxItem>
		{/each}
		{#if groupsStore.list.length}
			<DropdownMenu.Separator />
		{/if}
		<DropdownMenu.Item onSelect={() => (isCreating = true)}>
			<PlusIcon />
			{t('library.bulk.newGroup')}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<NewGroupDialog bind:open={isCreating} {mods} />
