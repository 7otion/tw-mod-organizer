<script lang="ts">
	import NameDialog from '@/components/name-dialog.svelte';

	import { t } from '@/lib/i18n';
	import type { Mod, TagColor } from '@/lib/models';
	import { GamesStore, GroupsStore } from '@/lib/store';

	type Props = {
		open: boolean;
		mods?: readonly Mod[];
		oncreated?: () => void;
	};

	let { open = $bindable(false), mods = [], oncreated }: Props = $props();

	const gamesStore = GamesStore.get();
	const groupsStore = GroupsStore.get();

	const description = $derived(
		mods.length
			? t('groups.new.withMods', { count: mods.length })
			: `${gamesStore.current!.series}: ${gamesStore.current!.title}`
	);

	async function create(name: string, color: TagColor): Promise<void> {
		await groupsStore.create(name, mods, { color });
		oncreated?.();
	}
</script>

<NameDialog
	bind:open
	id="new-group"
	kind="group"
	title={t('groups.new.title')}
	{description}
	nameLabel={t('groups.new.name')}
	submitLabel={t('groups.new.create')}
	hasColor
	isTaken={(name) => groupsStore.isNameTaken(name)}
	oncreate={create}
/>
