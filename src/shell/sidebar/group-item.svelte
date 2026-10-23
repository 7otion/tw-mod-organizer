<script lang="ts">
	import CopyIcon from '@lucide/svelte/icons/copy';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import TagColorPicker from '@/components/tag-color-picker.svelte';
	import * as ContextMenu from '@/components/ui/context-menu';
	import * as Dialog from '@/components/ui/dialog';
	import { Input } from '@/components/ui/input';

	import { t } from '@/lib/i18n';
	import {
		TAG_PRESETS,
		isTagPreset,
		type Group,
		type TagColor,
		type TagPreset,
	} from '@/lib/models';
	import { GroupsStore } from '@/lib/store';
	import { tagColor } from '@/lib/tag-swatches';
	import { cn, nameError } from '@/lib/utils';

	const NO_COLOUR = 'none';

	let { group, ondelete }: { group: Group; ondelete: () => void } = $props();

	const groupsStore = GroupsStore.get();

	const isSelected = $derived(group === groupsStore.selected);
	const color = $derived((group.color as TagColor | null) ?? null);
	const memberCount = $derived(groupsStore.memberCount(group));
	const linkedCount = $derived(groupsStore.linkedProfiles(group).length);

	let isRenaming = $state(false);
	let isPickingColor = $state(false);
	let name = $state('');
	let input = $state<HTMLInputElement | null>(null);

	const error = $derived(
		nameError('group', name, groupsStore.isNameTaken(name, group))
	);

	$effect(() => {
		input?.focus();
		input?.select();
	});

	function startRename(): void {
		name = group.name;
		isRenaming = true;
	}

	async function onkeydown(event: KeyboardEvent): Promise<void> {
		if (event.key === 'Escape') {
			isRenaming = false;
		} else if (event.key === 'Enter' && !error) {
			isRenaming = false;
			if (name.trim() !== group.name)
				await groupsStore.rename(group, name);
		}
	}

	async function recolor(option: string): Promise<void> {
		const next = option === NO_COLOUR ? null : (option as TagPreset);
		if (next !== color) await groupsStore.recolor(group, next);
	}

	async function pickCustom(picked: TagColor): Promise<void> {
		await groupsStore.recolor(group, picked);
	}
</script>

{#snippet dot(option: TagPreset)}
	<span
		class="size-2 shrink-0 rounded-full"
		style:background-color={tagColor(option)}
	></span>
{/snippet}

<li>
	{#if isRenaming}
		<div class="flex flex-col gap-1 px-4 py-1">
			<Input
				bind:ref={input}
				bind:value={name}
				aria-label={t('groups.nameLabel')}
				aria-invalid={error !== null}
				class="h-row-compact"
				{onkeydown}
				onblur={() => (isRenaming = false)}
			/>
			{#if error}
				<p class="text-xs text-status-missing">{t(error)}</p>
			{/if}
		</div>
	{:else}
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						aria-current={isSelected}
						class={cn(
							'flex h-11 w-full items-center gap-2.5 px-4 text-left text-md text-foreground-2 hover:bg-hover',
							isSelected &&
								'bg-linear-to-r from-pink-soft to-transparent text-foreground'
						)}
						onclick={() => groupsStore.select(group)}
					>
						<span
							class={cn(
								'size-[7px] shrink-0 rotate-45',
								isSelected
									? 'shadow-[0_0_6px_rgba(255,77,148,0.6)]'
									: 'border border-muted-foreground'
							)}
							style:background-color={isSelected || color
								? tagColor(color ?? 'pink')
								: undefined}
							style:border-color={color
								? tagColor(color)
								: undefined}
						></span>
						<span class="flex min-w-0 flex-1 flex-col leading-snug">
							<span class="truncate">{group.name}</span>
							<span
								class="truncate text-xs text-muted-foreground"
							>
								{t('sidebar.groups.mods', {
									count: memberCount,
								})} ·
								{linkedCount
									? t('sidebar.groups.linked', {
											count: linkedCount,
										})
									: t('sidebar.groups.notLinked')}
							</span>
						</span>
					</button>
				{/snippet}
			</ContextMenu.Trigger>
			<ContextMenu.Content
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<ContextMenu.Item onSelect={startRename}>
					<PencilIcon />
					{t('common.rename')}
				</ContextMenu.Item>
				<ContextMenu.Item onSelect={() => groupsStore.duplicate(group)}>
					<CopyIcon />
					{t('groups.duplicate')}
				</ContextMenu.Item>
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<PaletteIcon />
						{t('groups.changeColour')}
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent>
						<ContextMenu.RadioGroup
							value={color === null
								? NO_COLOUR
								: isTagPreset(color)
									? color
									: ''}
							onValueChange={recolor}
						>
							<ContextMenu.RadioItem value={NO_COLOUR}>
								<span
									class="size-2 shrink-0 rounded-full border border-muted-foreground"
								></span>
								{t('groups.noColour')}
							</ContextMenu.RadioItem>
							{#each TAG_PRESETS as option (option)}
								<ContextMenu.RadioItem value={option}>
									{@render dot(option)}
									{t(`tags.colors.${option}`)}
								</ContextMenu.RadioItem>
							{/each}
						</ContextMenu.RadioGroup>
						<ContextMenu.Separator />
						<ContextMenu.Item
							onSelect={() => (isPickingColor = true)}
						>
							<PlusIcon />
							{t('colorPicker.custom')}
						</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Separator />
				<ContextMenu.Item variant="destructive" onSelect={ondelete}>
					{t('common.delete')}
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	{/if}
</li>

<Dialog.Root bind:open={isPickingColor}>
	<Dialog.Content class="sm:max-w-[340px]">
		<Dialog.Header>
			<Dialog.Title>
				{t('groups.colourTitle', { name: group.name })}
			</Dialog.Title>
		</Dialog.Header>
		<TagColorPicker color={color ?? 'ash'} onpick={pickCustom} />
	</Dialog.Content>
</Dialog.Root>
