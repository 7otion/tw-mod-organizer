<script lang="ts">
	import { listen } from '@tauri-apps/api/event';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import FileIcon from '@lucide/svelte/icons/file';
	import PackageIcon from '@lucide/svelte/icons/package';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import UploadIcon from '@lucide/svelte/icons/upload';

	import * as AlertDialog from '@/components/ui/alert-dialog';
	import { Button } from '@/components/ui/button';
	import { Checkbox } from '@/components/ui/checkbox';
	import * as Dialog from '@/components/ui/dialog';
	import * as Field from '@/components/ui/field';
	import { Input } from '@/components/ui/input';
	import { Progress } from '@/components/ui/progress';
	import { Spinner } from '@/components/ui/spinner';

	import { formatSize, t } from '@/lib/i18n';
	import type { MessageKey } from '@/lib/i18n/message-key';
	import Message from '@/lib/i18n/message.svelte';
	import { AppStore, GamesStore, ProfilesStore } from '@/lib/store';
	import { cn } from '@/lib/utils';

	import {
		ModInstall,
		type Candidate,
		type Fact,
		type InstallProgress,
	} from './mod-install.svelte';

	const STEPS = ['pick', 'choose', 'install'] as const;
	const PROGRESS_STEPS: InstallProgress['step'][] = [
		'unpacking',
		'copying',
		'checking',
		'adding',
	];
	const FACT_LABELS: Record<string, MessageKey> = {
		identifiedBy: 'library.installMod.facts.identifiedBy',
		role: 'library.installMod.facts.role',
	};
	const FACT_VALUES: Record<string, MessageKey> = {
		'role.main': 'library.installMod.values.main',
		'role.patch': 'library.installMod.values.patch',
		'role.alternative': 'library.installMod.values.alternative',
	};

	const appStore = AppStore.get();
	const gamesStore = GamesStore.get();
	const profilesStore = ProfilesStore.get();
	const install = new ModInstall();

	let isDragOver = $state(false);
	let addToProfile = $state(false);

	const isOpen = $derived(appStore.isInstallingMod);
	const gameTitle = $derived(gamesStore.current?.title ?? '');
	const stepIndex = $derived(
		install.step === 'pick' ? 0 : install.step === 'choose' ? 1 : 2
	);
	const progressSteps = $derived.by(() => {
		const current = install.progress;
		const isArchive = install.inspection?.source.kind === 'archive';
		const steps = PROGRESS_STEPS.filter((step) =>
			isArchive ? step !== 'copying' : step !== 'unpacking'
		);
		const currentIndex = current ? steps.indexOf(current.step) : -1;
		return steps.map((step, index) => ({
			step,
			state:
				index < currentIndex
					? 'done'
					: index === currentIndex
						? 'active'
						: 'pending',
		}));
	});
	const overallProgress = $derived.by(() => {
		const current = install.progress;
		if (!current) return 0;
		const within = current.total_bytes
			? current.done / current.total_bytes
			: current.step === 'adding'
				? 1
				: 0.5;
		return ((current.index + within) / current.total) * 100;
	});

	$effect(() => {
		if (!isOpen) return;
		untrack(() => void install.loadInputs());
	});

	$effect(() => {
		const path = appStore.installPath;
		if (!isOpen || !path) return;
		appStore.installPath = null;
		untrack(() => void inspect(path));
	});

	$effect(() => {
		const unlisten = listen<InstallProgress>(
			'install-progress',
			(event) => (install.progress = event.payload)
		);
		return () => void unlisten.then((off) => off());
	});

	$effect(() => {
		const unlisten = getCurrentWebview().onDragDropEvent((event) => {
			if (
				event.payload.type === 'enter' ||
				event.payload.type === 'over'
			) {
				isDragOver = true;
				return;
			}
			isDragOver = false;
			if (event.payload.type !== 'drop') return;
			if (install.step === 'installing') return;
			const path = event.payload.paths.find((dropped) =>
				install.isSupported(dropped)
			);
			if (!path) {
				if (event.payload.paths.length)
					toast.warning(
						t('library.installMod.unsupportedDrop', {
							formats: install.accepted
								.map((extension) => `.${extension}`)
								.join(', '),
						})
					);
				return;
			}
			appStore.openInstallMod(path);
		});
		return () => void unlisten.then((off) => off());
	});

	async function inspect(path: string): Promise<void> {
		if (!install.inputs) await install.loadInputs();
		finish(await install.inspect(path));
	}

	async function pick(): Promise<void> {
		finish(await install.pickFile());
	}

	function close(): void {
		if (install.step === 'installing') void install.cancel();
		appStore.isInstallingMod = false;
		install.reset();
		addToProfile = false;
	}

	function finish(count: number): void {
		if (!count) return;
		appStore.isInstallingMod = false;
		install.reset();
		addToProfile = false;
		toast.success(t('library.installMod.installed', { count }));
	}

	function factLabel(fact: Fact): string {
		const key = FACT_LABELS[fact.label];
		return key ? t(key) : fact.label;
	}

	function factValue(fact: Fact): string {
		const key = FACT_VALUES[`${fact.label}.${fact.value}`];
		return key ? t(key) : fact.value;
	}

	function factsOf(candidate: Candidate): Fact[] {
		return [candidate.identity, ...candidate.facts];
	}

	function progressText(
		step: InstallProgress['step'],
		state: string
	): string {
		const current = install.progress;
		if (state === 'done')
			return t(`library.installMod.progress.${step}Done`);
		if (
			state === 'active' &&
			current &&
			current.total_bytes > 0 &&
			(step === 'unpacking' || step === 'copying')
		)
			return t(`library.installMod.progress.${step}Bytes`, {
				done: formatSize(current.done),
				total: formatSize(current.total_bytes),
			});
		return t(`library.installMod.progress.${step}`);
	}
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open) close();
	}}
>
	<Dialog.Content class="gap-5 sm:max-w-[640px]">
		<Dialog.Header>
			{#if install.step !== 'installing'}
				<p class="mb-3 flex gap-4 text-md">
					{#each STEPS as step, index (step)}
						<span
							class={cn(
								'flex items-center gap-1.5',
								index === stepIndex
									? 'font-semibold text-foreground'
									: 'text-muted-foreground'
							)}
						>
							<span
								class={cn(
									'grid size-5 place-items-center rounded-full text-xs',
									index < stepIndex
										? 'bg-status-ok/20 text-status-ok'
										: index === stepIndex
											? 'bg-pink text-pink-ink'
											: 'bg-fill-2'
								)}
							>
								{#if index < stepIndex}
									<CheckIcon class="size-3.5" />
								{:else}
									{index + 1}
								{/if}
							</span>
							{t(`library.installMod.steps.${step}`)}
						</span>
					{/each}
				</p>
			{/if}
			<Dialog.Title>
				{#if install.step === 'installing'}
					{t('library.installMod.installingTitle', {
						count: install.selectedCandidates.length,
						name: install.onlySelected?.name ?? install.name,
					})}
				{:else}
					{t('library.installMod.title')}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{#if install.step === 'installing' && install.progress}
					{t('library.installMod.installingOf', {
						name: install.progress.name,
						index: install.progress.index + 1,
						total: install.progress.total,
					})}
				{:else}
					{t('library.installMod.forGame', { game: gameTitle })}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if install.step === 'pick'}
			<button
				type="button"
				class={cn(
					'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-8 py-12 text-center transition-colors',
					isDragOver
						? 'border-pink bg-pink/10'
						: 'border-line-2 bg-tone-1 hover:bg-fill-1'
				)}
				disabled={install.isInspecting}
				onclick={pick}
			>
				{#if install.isInspecting}
					<Spinner class="size-6" />
				{:else}
					<UploadIcon class="size-8 text-muted-foreground" />
				{/if}
				<b class="text-lg font-semibold"
					>{t('library.installMod.dropHere')}</b
				>
				<span class="text-md text-muted-foreground">
					{t('library.installMod.orChoose')}
				</span>
			</button>
			<p
				class="flex flex-wrap items-center gap-2 text-md text-muted-foreground"
			>
				{t('library.installMod.accepted')}
				{#each install.accepted as extension (extension)}
					<span
						class="rounded-md bg-fill-1 px-2 py-1 font-mono text-sm"
					>
						.{extension}
					</span>
				{/each}
			</p>
			<Button
				variant="secondary"
				size="lg"
				class="self-start"
				disabled={install.isInspecting}
				onclick={pick}
			>
				<FileIcon />
				{t('library.installMod.chooseFile')}
			</Button>
			{#if install.error}
				<Field.Error>{install.error}</Field.Error>
			{/if}
			<p class="text-md text-muted-foreground">
				{t('library.installMod.note')}
			</p>
			<Dialog.Footer>
				<Button variant="ghost" onclick={close}
					>{t('common.cancel')}</Button
				>
			</Dialog.Footer>
		{:else if install.step === 'choose'}
			{@const inspection = install.inspection!}
			<div class="flex items-center gap-3 rounded-lg bg-tone-1 px-4 py-3">
				{#if inspection.source.kind === 'archive'}
					<ArchiveIcon
						class="size-6 shrink-0 text-muted-foreground"
					/>
				{:else}
					<FileIcon class="size-6 shrink-0 text-muted-foreground" />
				{/if}
				<span class="flex min-w-0 flex-1 flex-col leading-snug">
					<b class="truncate text-md font-semibold"
						>{inspection.source.name}</b
					>
					<span class="truncate text-md text-muted-foreground">
						{t('library.installMod.sourceMeta', {
							size: formatSize(inspection.source.size_bytes),
							folder: inspection.source.folder ?? '',
						})}
					</span>
				</span>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => install.changeSource()}
				>
					{t('common.changeEllipsis')}
				</Button>
			</div>

			<p class="flex items-center gap-2 text-md text-muted-foreground">
				<CircleCheckIcon class="size-4 text-status-ok" />
				<span>
					{#if install.isSingle}
						<Message
							key="library.installMod.foundPickOne"
							values={{ count: install.loadable.length }}
						>
							{#snippet value(text)}
								<b class="font-semibold text-foreground"
									>{text}</b
								>
							{/snippet}
						</Message>
					{:else}
						<Message
							key="library.installMod.foundRecognised"
							values={{ count: install.candidates.length }}
						>
							{#snippet value(text)}
								<b class="font-semibold text-foreground"
									>{text}</b
								>
							{/snippet}
						</Message>
						·
						<Message
							key="library.installMod.foundInstallable"
							values={{ count: install.loadable.length }}
						>
							{#snippet value(text)}
								<b class="font-semibold text-foreground"
									>{text}</b
								>
							{/snippet}
						</Message>
					{/if}
				</span>
			</p>

			<div
				class="flex flex-col gap-2"
				role="group"
				aria-label={t('library.installMod.candidates')}
			>
				{#each install.candidates as candidate (candidate.id)}
					{@const isSelected = install.isSelected(candidate)}
					{@const isLocked = candidate.problem !== null}
					<button
						type="button"
						role={install.isSingle ? 'radio' : 'checkbox'}
						aria-checked={isSelected}
						disabled={isLocked}
						class={cn(
							'flex cursor-pointer items-start gap-3.5 rounded-lg px-4 py-3 text-left transition-colors',
							isSelected
								? 'bg-fill-2'
								: 'bg-tone-1 hover:bg-fill-1',
							isLocked && 'cursor-not-allowed opacity-60'
						)}
						onclick={() => install.toggle(candidate)}
					>
						<span
							class={cn(
								'mt-1 grid size-4.5 shrink-0 place-items-center border-[1.5px] text-primary-foreground',
								install.isSingle
									? 'rounded-full'
									: 'rounded-sm',
								isSelected
									? 'border-primary bg-primary'
									: 'border-[#5a5459]'
							)}
						>
							{#if isSelected}
								{#if install.isSingle}
									<span
										class="size-1.5 rounded-full bg-current"
									></span>
								{:else}
									<CheckIcon class="size-3" />
								{/if}
							{/if}
						</span>
						<span class="flex min-w-0 flex-1 flex-col gap-1">
							<b class="truncate text-lg font-semibold"
								>{candidate.name}</b
							>
							{#if candidate.problem}
								<span
									class="flex items-center gap-1 text-sm text-status-missing"
								>
									<TriangleAlertIcon class="size-3" />
									{candidate.problem}
								</span>
							{:else}
								<span
									class="flex flex-wrap gap-x-5 gap-y-1 text-sm"
								>
									{#each factsOf(candidate) as fact (fact.label)}
										<span class="flex gap-1.5">
											<span class="text-muted-foreground">
												{factLabel(fact)}
											</span>
											<span
												class="font-mono text-foreground-2"
											>
												{factValue(fact)}
											</span>
										</span>
									{/each}
								</span>
							{/if}
						</span>
						<span
							class="shrink-0 text-md text-muted-foreground tabular-nums"
						>
							{formatSize(candidate.size_bytes)}
						</span>
					</button>
				{/each}
			</div>

			{#if install.onlySelected}
				<Field.Field>
					<Field.Label for="install-name">
						{t('library.installMod.nameLabel')}
					</Field.Label>
					<Input
						id="install-name"
						value={install.name}
						oninput={(event) =>
							install.setName(event.currentTarget.value)}
						aria-invalid={!install.name.trim()}
					/>
				</Field.Field>
			{/if}

			{#if profilesStore.active}
				<Field.Field orientation="horizontal">
					<Checkbox
						id="install-profile"
						bind:checked={addToProfile}
					/>
					<Field.Label for="install-profile" class="font-normal">
						{t('library.installMod.addToProfile', {
							profile: profilesStore.active.name,
						})}
					</Field.Label>
				</Field.Field>
			{/if}

			{#if install.error}
				<Field.Error>{install.error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button variant="ghost" onclick={() => install.changeSource()}>
					{t('library.installMod.back')}
				</Button>
				<Button
					disabled={!install.canInstall}
					onclick={() => void install.install().then(finish)}
				>
					<PackageIcon />
					{t('library.installMod.install', {
						count: install.selectedCandidates.length,
					})}
				</Button>
			</Dialog.Footer>
		{:else}
			<Progress value={overallProgress} class="h-2" />
			<ul class="flex flex-col gap-3 text-md">
				{#each progressSteps as { step, state } (step)}
					<li
						class={cn(
							'flex items-center gap-2.5',
							state === 'pending' && 'text-muted-foreground'
						)}
					>
						{#if state === 'done'}
							<CircleCheckIcon class="size-4 text-status-ok" />
						{:else if state === 'active'}
							<Spinner class="size-4" />
						{:else}
							<span
								class="mx-0.5 size-3 rounded-full border-[1.5px] border-current"
							></span>
						{/if}
						<span class="truncate tabular-nums">
							{progressText(step, state)}
						</span>
					</li>
				{/each}
			</ul>
			<Dialog.Footer>
				<Button variant="ghost" onclick={close}
					>{t('common.cancel')}</Button
				>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
	open={install.nothingFound}
	onOpenChange={(open) => {
		if (!open) install.changeSource();
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('library.installMod.nothing.title')}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('library.installMod.nothing.description', {
					game: gameTitle,
					file: install.inspection?.source.name ?? '',
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<div class="flex flex-col gap-1 rounded-lg bg-tone-1 px-3 py-2 text-sm">
			<span class="text-xs text-muted-foreground uppercase">
				{t('library.installMod.nothing.expects', { game: gameTitle })}
			</span>
			<span>{install.inspection?.nothing_installable_reason}</span>
		</div>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{t('common.close')}</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="secondary"
				onclick={() => {
					install.changeSource();
					void pick();
				}}
			>
				{t('library.installMod.nothing.pickAnother')}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root
	open={install.currentDuplicate !== null}
	onOpenChange={(open) => {
		if (!open) install.dismissDuplicates();
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{t('library.installMod.duplicate.title')}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{t('library.installMod.duplicate.description', {
					name: install.currentDuplicate?.candidate.name ?? '',
					owner: install.currentDuplicate?.owner.displayTitle ?? '',
					source: install.currentDuplicate
						? t(
								`library.sources.${install.currentDuplicate.owner.source}`
							)
						: '',
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="sm:justify-between">
			<Button
				variant="ghost"
				onclick={() => void install.skipDuplicate().then(finish)}
			>
				{t('library.installMod.duplicate.skip')}
			</Button>
			<span class="flex gap-2">
				{#if install.inspection?.identities_can_coexist}
					<Button
						variant="secondary"
						onclick={() => void install.keepBoth().then(finish)}
					>
						{t('library.installMod.duplicate.keepBoth')}
					</Button>
				{/if}
				{#if install.currentDuplicate?.owner.folder}
					<Button
						onclick={() =>
							void install.replaceDuplicate().then(finish)}
					>
						{t('library.installMod.duplicate.replace')}
					</Button>
				{/if}
			</span>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
