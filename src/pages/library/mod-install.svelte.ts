import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { SvelteSet } from 'svelte/reactivity';

import { problemText, t } from '@/lib/i18n';
import type { Mod } from '@/lib/models';
import { GamesStore, LibraryScanStore, LibraryStore } from '@/lib/store';

export type AcceptedInputs = {
	extensions: string[];
	archives: string[];
	folders: boolean;
};

export type Fact = {
	label: string;
	value: string;
};

export type Candidate = {
	id: string;
	name: string;
	identity: Fact;
	facts: Fact[];
	size_bytes: number;
	entries: string[];
	problem: string | null;
};

export type InstallSource = {
	path: string;
	name: string;
	folder: string | null;
	kind: 'file' | 'archive';
	size_bytes: number;
};

export type Inspection = {
	source: InstallSource;
	candidates: Candidate[];
	selection: 'single' | 'multiple';
	identities_can_coexist: boolean;
	nothing_installable_reason: string;
};

export type InstallStep = 'pick' | 'choose' | 'installing';

export type InstallProgress = {
	index: number;
	total: number;
	name: string;
	step: 'unpacking' | 'copying' | 'checking' | 'adding';
	done: number;
	total_bytes: number;
};

export type Duplicate = {
	candidate: Candidate;
	owner: Mod;
};

type InstallResult = {
	installed: string[];
	problem: { name: string; problem: string } | null;
	cancelled: boolean;
};

export class ModInstall {
	readonly #gamesStore = GamesStore.get();
	readonly #libraryStore = LibraryStore.get();
	readonly #scanStore = LibraryScanStore.get();
	readonly #selected = new SvelteSet<string>();

	step = $state<InstallStep>('pick');
	inputs = $state.raw<AcceptedInputs | null>(null);
	inspection = $state.raw<Inspection | null>(null);
	name = $state('');
	isNameEdited = $state(false);
	error = $state<string | null>(null);
	isInspecting = $state(false);
	nothingFound = $state(false);
	progress = $state.raw<InstallProgress | null>(null);
	pendingDuplicates = $state.raw<readonly Duplicate[]>([]);
	#replacements = $state.raw<Readonly<Record<string, string>>>({});

	readonly accepted = $derived([
		...(this.inputs?.archives ?? []),
		...(this.inputs?.extensions ?? []),
	]);
	readonly candidates = $derived(this.inspection?.candidates ?? []);
	readonly isSingle = $derived(this.inspection?.selection === 'single');
	readonly loadable = $derived(
		this.candidates.filter((candidate) => candidate.problem === null)
	);
	readonly selectedCandidates = $derived(
		this.candidates.filter((candidate) => this.#selected.has(candidate.id))
	);
	readonly onlySelected = $derived(
		this.selectedCandidates.length === 1 ? this.selectedCandidates[0] : null
	);
	readonly canInstall = $derived(
		this.selectedCandidates.length > 0 &&
			(this.onlySelected === null || this.name.trim().length > 0)
	);
	readonly currentDuplicate = $derived(this.pendingDuplicates[0] ?? null);

	isSelected(candidate: Candidate): boolean {
		return this.#selected.has(candidate.id);
	}

	isSupported(path: string): boolean {
		const extension = path.split('.').pop()?.toLowerCase() ?? '';
		return this.accepted.includes(extension);
	}

	async loadInputs(): Promise<void> {
		this.inputs = await invoke<AcceptedInputs>('install_inputs', {
			app_id: this.#gamesStore.current!.app_id,
		});
	}

	async pickFile(): Promise<number> {
		if (!this.inputs) await this.loadInputs();
		const path = await open({
			filters: [
				{
					name: t('library.installMod.acceptedFilter'),
					extensions: this.accepted,
				},
			],
		});
		return path ? this.inspect(path) : 0;
	}

	async inspect(path: string): Promise<number> {
		this.isInspecting = true;
		this.error = null;
		try {
			const inspection = await invoke<Inspection>(
				'inspect_install_source',
				{
					app_id: this.#gamesStore.current!.app_id,
					path,
				}
			);
			this.inspection = inspection;
			this.#replacements = {};
			this.#selected.clear();
			this.isNameEdited = false;
			if (!inspection.candidates.length) {
				this.nothingFound = true;
				return 0;
			}
			const preselected =
				inspection.selection === 'single'
					? this.loadable.slice(0, 1)
					: this.loadable;
			for (const candidate of preselected)
				this.#selected.add(candidate.id);
			this.syncName();
			if (
				inspection.candidates.length === 1 &&
				this.loadable.length === 1
			)
				return await this.install();
			this.step = 'choose';
			return 0;
		} catch (error) {
			this.error = String(error);
			return 0;
		} finally {
			this.isInspecting = false;
		}
	}

	toggle(candidate: Candidate): void {
		if (candidate.problem !== null) return;
		if (this.isSingle) {
			this.#selected.clear();
			this.#selected.add(candidate.id);
		} else if (this.#selected.has(candidate.id)) {
			this.#selected.delete(candidate.id);
		} else {
			this.#selected.add(candidate.id);
		}
		this.syncName();
	}

	setName(name: string): void {
		this.name = name;
		this.isNameEdited = true;
	}

	changeSource(): void {
		this.step = 'pick';
		this.nothingFound = false;
		this.error = null;
	}

	async install(): Promise<number> {
		if (!this.canInstall) return 0;
		const duplicates = this.selectedCandidates.flatMap((candidate) => {
			const owner = this.#libraryStore.list.find(
				(mod) =>
					!mod.isMissing &&
					mod.game_ref?.toLowerCase() ===
						candidate.identity.value.toLowerCase()
			);
			return owner ? [{ candidate, owner }] : [];
		});
		if (duplicates.length) {
			this.pendingDuplicates = duplicates;
			return 0;
		}
		return this.run();
	}

	skipDuplicate(): Promise<number> {
		const current = this.currentDuplicate!;
		this.#selected.delete(current.candidate.id);
		return this.resolveDuplicate();
	}

	keepBoth(): Promise<number> {
		return this.resolveDuplicate();
	}

	replaceDuplicate(): Promise<number> {
		const current = this.currentDuplicate!;
		if (current.owner.folder)
			this.#replacements = {
				...this.#replacements,
				[current.candidate.id]: current.owner.folder,
			};
		return this.resolveDuplicate();
	}

	dismissDuplicates(): void {
		this.pendingDuplicates = [];
		this.step = 'choose';
	}

	async cancel(): Promise<void> {
		await invoke('cancel_install');
	}

	reset(): void {
		this.step = 'pick';
		this.inspection = null;
		this.#selected.clear();
		this.#replacements = {};
		this.name = '';
		this.isNameEdited = false;
		this.error = null;
		this.nothingFound = false;
		this.progress = null;
		this.pendingDuplicates = [];
	}

	private async resolveDuplicate(): Promise<number> {
		this.pendingDuplicates = this.pendingDuplicates.slice(1);
		if (this.pendingDuplicates.length) return 0;
		if (!this.selectedCandidates.length) {
			this.step = 'choose';
			return 0;
		}
		return this.run();
	}

	private syncName(): void {
		if (this.isNameEdited) return;
		this.name = this.onlySelected?.name ?? '';
	}

	private async run(): Promise<number> {
		const inspection = this.inspection!;
		const only = this.onlySelected;
		this.step = 'installing';
		this.progress = null;
		this.error = null;
		try {
			const result = await invoke<InstallResult>('install_mod', {
				app_id: this.#gamesStore.current!.app_id,
				request: {
					source: inspection.source.path,
					mods: this.selectedCandidates.map((candidate) => ({
						name:
							candidate === only && this.name.trim()
								? this.name.trim()
								: candidate.name,
						entries: candidate.entries,
						size_bytes: candidate.size_bytes,
						replace_folder:
							this.#replacements[candidate.id] ?? null,
					})),
				},
			});
			if (result.installed.length) await this.#scanStore.scan();
			if (result.problem)
				this.error = t('library.installMod.problem', {
					name: result.problem.name,
					problem: problemText(result.problem.problem),
				});
			if (result.problem || result.cancelled) {
				this.step = 'choose';
				return 0;
			}
			return result.installed.length;
		} catch (error) {
			this.error = String(error);
			this.step = 'choose';
			return 0;
		}
	}
}
