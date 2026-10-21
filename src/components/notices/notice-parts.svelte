<script lang="ts" module>
	import LibraryIcon from '@lucide/svelte/icons/library';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';

	import { formatWhen, problemText, t } from '@/lib/i18n';
	import Message from '@/lib/i18n/message.svelte';
	import { icon } from '@/lib/mod-table/row-icons.svelte';
	import {
		NOTICE_CATEGORY_SPECS,
		type NoticeCategory,
		type NoticeScope,
	} from '@/lib/notices/categories';
	import type { Notice } from '@/lib/store';

	export { categoryIcon, reason, scopeChip };
</script>

{#snippet categoryIcon(category: NoticeCategory, className: string)}
	{@render icon(NOTICE_CATEGORY_SPECS[category].icon, className)}
{/snippet}

{#snippet scopeChip(scope: NoticeScope, profileName: string)}
	<span
		class="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-fill-1 px-2 text-2xs font-semibold whitespace-nowrap text-muted-foreground"
	>
		{#if scope === 'library'}
			<LibraryIcon class="size-3" />
			{t('notices.scope.library')}
		{:else}
			<ListOrderedIcon class="size-3" />
			<b class="text-foreground-2">{profileName}</b>
		{/if}
	</span>
{/snippet}

{#snippet bold(text: string)}
	<b class="font-semibold text-foreground">{text}</b>
{/snippet}

{#snippet reason(notice: Notice)}
	{#if notice.category === 'missing'}
		{@const [first] = notice.requirements}
		<Message
			key={notice.requirements.length > 1
				? 'notices.reason.missingMore'
				: 'notices.reason.missing'}
			values={{
				title:
					first.required_title ??
					t('modDetails.dependencies.unknownTitle', {
						id: first.required_ref,
					}),
				count: notice.requirements.length - 1,
			}}
		>
			{#snippet value(text)}
				{@render bold(text)}
			{/snippet}
		</Message>
	{:else if notice.category === 'broken'}
		{t(
			notice.mod.isMissing
				? 'notices.reason.gone'
				: 'notices.reason.broken',
			{ problem: problemText(notice.problem) }
		)}
	{:else if notice.category === 'order'}
		<Message
			key="notices.reason.order"
			values={{
				title: notice.requirement.displayTitle,
				number: t('notices.number', {
					number: notice.requirementNumber,
				}),
			}}
		>
			{#snippet value(text, name)}
				{#if name === 'number'}
					<span class="font-mono text-2xs text-muted-foreground"
						>{text}</span
					>
				{:else}
					{@render bold(text)}
				{/if}
			{/snippet}
		</Message>
	{:else}
		{t('notices.reason.steam', { when: formatWhen(notice.updatedAt) })}
	{/if}
{/snippet}
