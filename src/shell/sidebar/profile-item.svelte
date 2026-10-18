<script lang="ts">
	import { Count } from '@7otion-tauri/orm';

	import * as ContextMenu from '@/components/ui/context-menu';
	import { Input } from '@/components/ui/input';

	import { type Profile, ProfileEntry } from '@/lib/models';
	import { ProfilesStore } from '@/lib/store';
	import { cn, nameError } from '@/lib/utils';

	let { profile, ondelete }: { profile: Profile; ondelete: () => void } =
		$props();

	const profilesStore = ProfilesStore.get();

	const active = $derived(profile === profilesStore.active);

	const modCount = new Count(() =>
		ProfileEntry.query()
			.where('profile_id', profile.id)
			.whereNotNull('mod_id')
	);

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
			isRenaming = false;
		} else if (event.key === 'Enter' && !error) {
			isRenaming = false;
			if (name.trim() !== profile.name)
				await profilesStore.rename(profile, name);
		}
	}

	function activate(): void {
		if (!active) profilesStore.activate(profile);
	}
</script>

<li>
	{#if isRenaming}
		<div class="flex flex-col gap-1 px-4 py-1">
			<Input
				bind:ref={input}
				bind:value={name}
				aria-label="Profile name"
				aria-invalid={error !== null}
				class="h-row-compact"
				{onkeydown}
				onblur={() => (isRenaming = false)}
			/>
			{#if error}
				<p class="text-xs text-status-missing">{error}</p>
			{/if}
		</div>
	{:else}
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						aria-current={active}
						class={cn(
							'flex h-row-compact w-full items-center gap-2 px-4 text-left text-md text-foreground-2 hover:bg-hover',
							active &&
								'bg-linear-to-r from-pink-soft to-transparent text-foreground'
						)}
						onclick={activate}
					>
						{#if active}
							<span
								class="size-[7px] shrink-0 rotate-45 bg-pink-deep shadow-[0_0_6px_rgba(255,77,148,0.6)]"
							></span>
						{:else}
							<span
								class="size-[7px] shrink-0 rotate-45 border border-muted-foreground"
							></span>
						{/if}
						<span class="min-w-0 flex-1 truncate"
							>{profile.name}</span
						>
						<span class="font-mono text-xs text-muted-foreground">
							{modCount.current}
						</span>
					</button>
				{/snippet}
			</ContextMenu.Trigger>
			<ContextMenu.Content
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<ContextMenu.Item onSelect={startRename}
					>Rename</ContextMenu.Item
				>
				<ContextMenu.Item
					variant="destructive"
					disabled={active}
					onSelect={ondelete}
				>
					Delete…
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	{/if}
</li>
