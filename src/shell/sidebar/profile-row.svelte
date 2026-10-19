<script lang="ts">
	import { Count } from '@7otion-tauri/orm';
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import type { LucideIcon } from '@lucide/svelte';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	import { Badge } from '@/components/ui/badge';
	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import { Input } from '@/components/ui/input';
	import * as Tooltip from '@/components/ui/tooltip';

	import { type Profile, ProfileEntry } from '@/lib/models';
	import type { Selection } from '@/lib/selection.svelte';
	import { ProfilesStore, SettingsStore } from '@/lib/store';
	import { cn, formatDate, nameError, timeAgo } from '@/lib/utils';

	type Props = {
		profile: Profile;
		index: number;
		canDrag: boolean;
		selection: Selection<number>;
		ondelete: () => void;
	};

	let { profile, index, canDrag, selection, ondelete }: Props = $props();

	const profilesStore = ProfilesStore.get();
	const settingsStore = SettingsStore.get();

	const active = $derived(profile === profilesStore.active);
	const selected = $derived(selection.has(profile.id));

	const sortable = createSortable({
		get id() {
			return profile.id;
		},
		get index() {
			return index;
		},
		get disabled() {
			return !canDrag;
		},
	});

	const mods = new Count(() =>
		ProfileEntry.query()
			.where('profile_id', profile.id)
			.whereNotNull('mod_id')
	);
	const enabled = new Count(() =>
		ProfileEntry.query()
			.where('profile_id', profile.id)
			.whereNotNull('mod_id')
			.where('enabled', true)
	);
	const groups = new Count(() =>
		ProfileEntry.query()
			.where('profile_id', profile.id)
			.whereNotNull('group_id')
	);

	const description = $derived.by(() => {
		if (mods.current === 0) return 'Empty';
		if (enabled.current < mods.current)
			return `${mods.current - enabled.current} off`;
		return '';
	});

	let isRenaming = $state(false);
	let name = $state('');
	let input = $state<HTMLInputElement | null>(null);

	const error = $derived(
		nameError('profile', name, profilesStore.isNameTaken(name, profile))
	);

	$effect(() => {
		input?.focus();
		input?.select();
	});

	function startRename(): void {
		name = profile.name;
		isRenaming = true;
	}

	async function onkeydown(event: KeyboardEvent): Promise<void> {
		if (event.key === 'Escape') {
			event.stopPropagation();
			isRenaming = false;
		} else if (event.key === 'Enter' && !error) {
			isRenaming = false;
			if (name.trim() !== profile.name)
				await profilesStore.rename(profile, name);
		}
	}

	function activate(): void {
		profilesStore.activate(profile);
	}

	function clone(): void {
		profilesStore.clone(profile);
	}

	function created(date: Date): string {
		const today = new Date();
		if (date.toDateString() === today.toDateString()) return 'Today';
		return formatDate(date, settingsStore.datePattern);
	}
</script>

{#snippet action(
	label: string,
	Icon: LucideIcon,
	onclick: () => void,
	isDanger = false
)}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon-sm"
					aria-label={label}
					class={cn(isDanger && 'text-status-missing')}
					{onclick}
				>
					<Icon />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>{label}</Tooltip.Content>
	</Tooltip.Root>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<li
	{@attach sortable.attach}
	class={cn(
		'group grid min-h-12 grid-cols-[18px_16px_minmax(0,1fr)_64px_64px_64px_104px_88px_136px] items-center gap-x-3 rounded-md px-3 transition-colors duration-120 hover:bg-fill-1',
		selected && 'bg-pink-tint hover:bg-pink-tint-2',
		sortable.isDragging && 'bg-surface-1'
	)}
	onclick={(event) => selection.select(profile.id, event)}
>
	<Checkbox
		checked={selected}
		aria-label="Select {profile.name}"
		onclick={(event) => event.stopPropagation()}
		onCheckedChange={() => selection.toggle(profile.id)}
	/>
	<span
		{@attach sortable.attachHandle}
		class={cn(
			'grid place-items-center text-foreground-4 group-hover:text-muted-foreground',
			canDrag ? 'cursor-grab' : 'invisible'
		)}
	>
		<GripVerticalIcon class="size-4" />
	</span>

	<span class="flex min-w-0 items-center gap-2">
		<span
			class={cn(
				'size-2 shrink-0 rounded-full',
				active ? 'bg-pink' : 'shadow-[inset_0_0_0_1.5px_var(--text-4)]'
			)}
		></span>
		{#if isRenaming}
			<span class="flex flex-col gap-1 py-1">
				<Input
					bind:ref={input}
					bind:value={name}
					aria-label="Profile name"
					aria-invalid={error !== null}
					class="h-7 w-64 font-semibold"
					onclick={(event) => event.stopPropagation()}
					{onkeydown}
					onblur={() => (isRenaming = false)}
				/>
				{#if error}
					<span class="text-xs text-status-missing">{error}</span>
				{/if}
			</span>
		{:else}
			<span class="flex min-w-0 flex-col leading-tight">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span class="truncate font-semibold" ondblclick={startRename}>
					{profile.name}
				</span>
				{#if description}
					<span class="truncate text-sm text-muted-foreground">
						{description}
					</span>
				{/if}
			</span>
			{#if active}
				<Badge variant="secondary">Active</Badge>
			{/if}
		{/if}
	</span>

	<span class="text-right font-mono text-sm text-foreground-2">
		{mods.current}
	</span>
	<span class="text-right font-mono text-sm text-foreground-2">
		{enabled.current}
	</span>
	<span
		class={cn(
			'text-right font-mono text-sm',
			groups.current ? 'text-foreground-2' : 'text-muted-foreground'
		)}
	>
		{groups.current || '—'}
	</span>
	<span class="text-sm text-muted-foreground">
		{profile.last_used_at ? timeAgo(profile.last_used_at) : 'Never'}
	</span>
	<span class="text-sm text-muted-foreground">
		{created(profile.created_at)}
	</span>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<span
		class="flex justify-end gap-0.5 opacity-0 transition-opacity duration-120 group-hover:opacity-100"
		onclick={(event) => event.stopPropagation()}
	>
		{#if !active}
			{@render action('Make active', CircleCheckIcon, activate)}
		{/if}
		{@render action('Rename', PencilIcon, startRename)}
		{@render action('Clone', CopyIcon, clone)}
		{#if active}
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<span {...props}>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Delete"
								disabled
							>
								<Trash2Icon />
							</Button>
						</span>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content
					>Make another profile active first</Tooltip.Content
				>
			</Tooltip.Root>
		{:else}
			{@render action('Delete…', Trash2Icon, ondelete, true)}
		{/if}
	</span>
</li>
