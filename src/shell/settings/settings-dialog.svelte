<script lang="ts">
	import type { Component } from 'svelte';

	import { Button } from '@/components/ui/button';
	import * as Dialog from '@/components/ui/dialog';
	import { ScrollArea } from '@/components/ui/scroll-area';

	import { t } from '@/lib/i18n';
	import type { MessageKey } from '@/lib/i18n/message-key';
	import { cn } from '@/lib/utils';

	import AboutCard from './about-card.svelte';
	import AccountsCard from './accounts-card.svelte';
	import DisplayCard from './display-card.svelte';
	import FoldersCard from './folders-card.svelte';
	import ImportCard from './import-card.svelte';
	import LoadOrderCard from './load-order-card.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const SECTIONS: {
		id: string;
		labelKey: MessageKey;
		card: Component;
	}[] = [
		{
			id: 'folders',
			labelKey: 'settings.sections.folders',
			card: FoldersCard,
		},
		{
			id: 'load-order',
			labelKey: 'settings.sections.loadOrder',
			card: LoadOrderCard,
		},
		{
			id: 'display',
			labelKey: 'settings.sections.display',
			card: DisplayCard,
		},
		{
			id: 'accounts',
			labelKey: 'settings.sections.accounts',
			card: AccountsCard,
		},
		{
			id: 'import',
			labelKey: 'settings.sections.import',
			card: ImportCard,
		},
		{ id: 'about', labelKey: 'settings.sections.about', card: AboutCard },
	];

	let viewport = $state<HTMLElement | null>(null);
	let activeId = $state(SECTIONS[0].id);
	let isJumping = false;

	$effect(() => {
		if (!viewport) return;
		const scroller = viewport;
		const release = () => (isJumping = false);
		const follow = () => {
			if (isJumping) return;
			const top = scroller.getBoundingClientRect().top;
			const sections = [
				...scroller.querySelectorAll<HTMLElement>('[data-section]'),
			];
			const current =
				sections.find((section) => {
					const header = section.querySelector(
						'[data-slot=card-header]'
					);
					return (
						header && header.getBoundingClientRect().bottom > top
					);
				}) ?? sections.at(-1);
			if (current) activeId = current.dataset.section!;
		};
		scroller.addEventListener('scroll', follow);
		scroller.addEventListener('scrollend', release);
		scroller.addEventListener('wheel', release);
		scroller.addEventListener('pointerdown', release);
		return () => {
			scroller.removeEventListener('scroll', follow);
			scroller.removeEventListener('scrollend', release);
			scroller.removeEventListener('wheel', release);
			scroller.removeEventListener('pointerdown', release);
		};
	});

	function show(id: string): void {
		activeId = id;
		isJumping = true;
		viewport
			?.querySelector(`[data-section="${id}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex h-[min(720px,calc(100vh-var(--h-titlebar)-2rem))] w-[1000px] flex-row gap-0 overflow-hidden p-0 sm:max-w-[calc(100%-2rem)]"
	>
		<nav
			aria-label={t('settings.sectionsLabel')}
			class="flex w-56 shrink-0 flex-col gap-px border-r bg-tone-1 px-2 py-4"
		>
			{#each SECTIONS as section (section.id)}
				{@const isActive = section.id === activeId}
				<Button
					variant="ghost"
					aria-current={isActive}
					onclick={() => show(section.id)}
					class={cn(
						'h-row-compact justify-start gap-2 px-2 font-medium',
						isActive && 'bg-fill-2 text-foreground'
					)}
				>
					<span
						class={cn(
							'shrink-0 rounded-full',
							isActive
								? 'size-[7px] bg-pink'
								: 'size-2 shadow-[inset_0_0_0_1.5px_var(--text-4)]'
						)}
					></span>
					{t(section.labelKey)}
				</Button>
			{/each}
		</nav>

		<div class="flex min-w-0 flex-1 flex-col">
			<div class="flex items-end gap-4 px-6 pt-5 pb-4">
				<Dialog.Title class="font-blackletter text-title font-medium">
					{t('settings.title')}
				</Dialog.Title>
				<Dialog.Description class="pb-1.5 text-sm">
					{t('settings.autosave')}
				</Dialog.Description>
			</div>

			<ScrollArea class="min-h-0 flex-1" bind:viewportRef={viewport}>
				<div class="flex flex-col gap-4 px-6 pb-6">
					{#each SECTIONS as section (section.id)}
						<section
							data-section={section.id}
							class={[
								'**:data-[slot=card-title]:uppercase',
								section.id === activeId &&
									'**:data-[slot=card-header]:border-pink/20 **:data-[slot=card-title]:text-pink',
							]}
						>
							<section.card />
						</section>
					{/each}
				</div>
			</ScrollArea>
		</div>
	</Dialog.Content>
</Dialog.Root>
