<script lang="ts">
	import SaveIcon from '@lucide/svelte/icons/save';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import TagsIcon from '@lucide/svelte/icons/tags';

	import { Button } from '@/components/ui/button';

	import LibrarySummary from './library-summary.svelte';
	import LoadOrderOutline from './load-order-outline.svelte';
	import ManageTagsDialog from './manage-tags-dialog.svelte';
	import ProfileList from './profile-list.svelte';

	let isManagingTags = $state(false);
</script>

<aside
	class="flex min-h-0 w-sidebar shrink-0 flex-col border-r border-line bg-panel bg-fade-black"
>
	<ProfileList />
	<div
		aria-hidden="true"
		class="flex items-center gap-2 px-4 py-0.5 before:h-px before:flex-1 before:bg-line-strong after:h-px after:flex-1 after:bg-line-strong"
	>
		<span class="size-1.5 rotate-45 bg-line-strong"></span>
	</div>
	<LoadOrderOutline />
	<div class="flex flex-col gap-0.5 border-t border-line py-3">
		<Button
			variant="ghost"
			class="h-7 justify-start gap-2 rounded-none px-4 text-md font-normal text-foreground-2 hover:bg-hover"
		>
			<SaveIcon class="size-4" />
			Rebuild profile from a save…
		</Button>
		<Button
			variant="ghost"
			class="h-7 justify-start gap-2 rounded-none px-4 text-md font-normal text-foreground-2 hover:bg-hover"
		>
			<Settings2Icon class="size-4" />
			Manage profiles…
		</Button>
		<Button
			variant="ghost"
			class="h-7 justify-start gap-2 rounded-none px-4 text-md font-normal text-foreground-2 hover:bg-hover"
			onclick={() => (isManagingTags = true)}
		>
			<TagsIcon class="size-4" />
			Manage tags…
		</Button>
		<LibrarySummary />
	</div>
</aside>

<ManageTagsDialog bind:open={isManagingTags} />
