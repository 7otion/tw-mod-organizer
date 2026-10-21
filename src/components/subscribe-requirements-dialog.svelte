<script lang="ts">
	import * as AlertDialog from '@/components/ui/alert-dialog';

	import { t } from '@/lib/i18n';
	import type { ModDependency } from '@/lib/models';

	type Props = {
		open: boolean;
		requirements: readonly ModDependency[];
		onconfirm: () => void;
	};

	let { open = $bindable(false), requirements, onconfirm }: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('library.subscribeConfirm.title', {
					count: requirements.length,
				})}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('library.subscribeConfirm.description')}
				<ul class="mt-2 flex list-disc flex-col gap-1 pl-4">
					{#each requirements as requirement (requirement.required_ref)}
						<li>
							{requirement.required_title ??
								t('modDetails.dependencies.unknownTitle', {
									id: requirement.required_ref,
								})}
						</li>
					{/each}
				</ul>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={onconfirm}>
				{t('library.subscribeConfirm.confirm')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
