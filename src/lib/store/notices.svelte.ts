import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ConnectionStore } from '@7otion-tauri/orm';
import { tick } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';

import { t } from '@/lib/i18n';
import {
	ProfileGroupDisabled,
	type Group,
	type Mod,
	type ModDependency,
	type Profile,
	type ProfileEntry,
} from '@/lib/models';
import {
	NOTICE_CATEGORIES,
	NOTICE_CATEGORY_SPECS,
	type NoticeCategory,
	type NoticeGroup,
} from '@/lib/notices/categories';
import { keyBetween } from '@/lib/position';
import {
	GamesStore,
	GroupsStore,
	LibraryScanStore,
	LibraryStore,
	ProfilesStore,
	WorkshopDownloadsStore,
} from '@/lib/store';

type NoticeBase = {
	key: string;
	mod: Mod;
};

export type MissingNotice = NoticeBase & {
	category: 'missing';
	requirements: readonly ModDependency[];
};

export type BrokenNotice = NoticeBase & {
	category: 'broken';
	problem: string;
};

export type OrderNotice = NoticeBase & {
	category: 'order';
	requirement: Mod;
	number: number;
	requirementNumber: number;
};

export type SteamNotice = NoticeBase & {
	category: 'steam';
	updatedAt: Date;
};

export type Notice = MissingNotice | BrokenNotice | OrderNotice | SteamNotice;

export type NoticesTab = 'all' | NoticeGroup;

export type NoticesScope =
	| { kind: 'library' }
	| { kind: 'group'; group: Group | null }
	| { kind: 'profile'; profile: Profile | null };

export type NoticesOpening = {
	category?: NoticeCategory;
	mod?: Mod;
};

export type LocateTarget = {
	locate(modId: number, color: string): boolean;
};

type OrderSlot = {
	mod: Mod;
	number: number;
	entry: ProfileEntry;
	group: Group | null;
	isEnabled: boolean;
};

type PendingLocate = {
	modId: number;
	color: string;
};

const NO_NOTICES: readonly Notice[] = [];
const NO_FLAGS: NoticeCategory[] = [];

export class NoticesStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #libraryStore = LibraryStore.get();
	readonly #profilesStore = ProfilesStore.get();
	readonly #groupsStore = GroupsStore.get();
	readonly #scanStore = LibraryScanStore.get();
	readonly #downloadsStore = WorkshopDownloadsStore.get();
	readonly #disabled = this.query(() =>
		ProfileGroupDisabled.query().where(
			'profile_id',
			this.#profilesStore.active?.id ?? 0
		)
	);

	#filterModId = $state<number | null>(null);
	#detailsModId = $state<number | null>(null);
	#pageTable: LocateTarget | null = null;
	#pendingLocate: PendingLocate | null = null;

	isOpen = $state(false);
	tab = $state<NoticesTab>('all');
	search = $state('');
	readonly collapsed = new SvelteSet<NoticeCategory>();

	readonly #slots = $derived.by((): OrderSlot[] => {
		const profile = this.#profilesStore.active;
		if (!profile) return [];
		const disabled = Object.fromEntries(
			this.#disabled.rows.map((row) => [
				`${row.group_id}:${row.mod_id}`,
				true,
			])
		) as Record<string, true>;
		const slots: OrderSlot[] = [];
		for (const entry of this.#libraryStore.entriesOf(profile)) {
			if (entry.mod_id !== null) {
				const mod = this.#libraryStore.modById(entry.mod_id);
				if (mod)
					slots.push({
						mod,
						number: slots.length + 1,
						entry,
						group: null,
						isEnabled: entry.enabled,
					});
			} else if (entry.group_id !== null) {
				const group = this.#groupsStore.list.find(
					(group) => group.id === entry.group_id
				);
				if (!group) continue;
				for (const { mod } of this.#groupsStore.modsOf(group))
					slots.push({
						mod,
						number: slots.length + 1,
						entry,
						group,
						isEnabled:
							entry.enabled &&
							!(`${group.id}:${mod.id}` in disabled),
					});
			}
		}
		return slots;
	});
	readonly #slotsByModId = $derived.by(() => {
		const slots: Record<number, OrderSlot> = {};
		for (const slot of this.#slots) {
			const known = slots[slot.mod.id];
			if (!known || (!known.isEnabled && slot.isEnabled))
				slots[slot.mod.id] = slot;
		}
		return slots;
	});
	readonly #missing = $derived.by((): MissingNotice[] =>
		this.#libraryStore.list.flatMap((mod) => {
			if (NoticesStore.isBroken(mod)) return [];
			const requirements = this.#libraryStore.missingRequirementsOf(mod);
			if (!requirements.length) return [];
			return [
				{
					key: `missing:${mod.id}`,
					category: 'missing',
					mod,
					requirements,
				},
			];
		})
	);
	readonly #broken = $derived.by((): BrokenNotice[] =>
		this.#libraryStore.list.flatMap((mod) =>
			NoticesStore.isBroken(mod)
				? [
						{
							key: `broken:${mod.id}`,
							category: 'broken',
							mod,
							problem: mod.problem ?? 'folder_removed',
						},
					]
				: []
		)
	);
	readonly #order = $derived.by((): OrderNotice[] => {
		const slots = this.#slotsByModId;
		return this.#slots.flatMap((slot) => {
			if (!slot.isEnabled || slots[slot.mod.id] !== slot) return [];
			return this.#libraryStore
				.dependenciesOf(slot.mod)
				.requires.flatMap(({ mod }) => {
					const required = mod ? slots[mod.id] : undefined;
					if (
						!required?.isEnabled ||
						required.mod === slot.mod ||
						required.number < slot.number
					)
						return [];
					return [
						{
							key: `order:${slot.mod.id}:${required.mod.id}`,
							category: 'order',
							mod: slot.mod,
							requirement: required.mod,
							number: slot.number,
							requirementNumber: required.number,
						},
					];
				});
		});
	});
	readonly #steam = $derived.by((): SteamNotice[] =>
		this.#libraryStore.list.flatMap((mod) =>
			mod.hasUnseenUpdate && !NoticesStore.isBroken(mod)
				? [
						{
							key: `steam:${mod.id}`,
							category: 'steam',
							mod,
							updatedAt: mod.remote_updated_at!,
						},
					]
				: []
		)
	);

	readonly #all = $derived<readonly Notice[]>([
		...this.#missing,
		...this.#broken,
		...this.#order,
		...this.#steam,
	]);
	readonly scope = $derived.by((): NoticesScope => {
		const path = page.url.pathname;
		if (path.startsWith('/library')) return { kind: 'library' };
		if (path.startsWith('/groups'))
			return { kind: 'group', group: this.#groupsStore.selected };
		return { kind: 'profile', profile: this.#profilesStore.active };
	});
	readonly scopeKey = $derived.by((): string => {
		const scope = this.scope;
		switch (scope.kind) {
			case 'library':
				return 'library';
			case 'group':
				return `group:${scope.group?.id ?? 0}`;
			case 'profile':
				return `profile:${scope.profile?.id ?? 0}`;
		}
	});
	readonly categories = $derived<readonly NoticeCategory[]>(
		this.scope.kind === 'profile'
			? NOTICE_CATEGORIES
			: NOTICE_CATEGORIES.filter(
					(category) =>
						NOTICE_CATEGORY_SPECS[category].scope === 'library'
				)
	);
	readonly list = $derived.by((): readonly Notice[] => {
		const scope = this.scope;
		const categories = this.categories;
		const inScope = this.#all.filter((notice) =>
			categories.includes(notice.category)
		);
		switch (scope.kind) {
			case 'library':
				return inScope;
			case 'group': {
				if (!scope.group) return [];
				const members = Object.fromEntries(
					this.#groupsStore
						.modsOf(scope.group)
						.map(({ mod }) => [mod.id, true])
				) as Record<number, true>;
				return inScope.filter((notice) => notice.mod.id in members);
			}
			case 'profile': {
				if (!scope.profile) return [];
				const slots = this.#slotsByModId;
				return inScope.filter((notice) => notice.mod.id in slots);
			}
		}
	});
	readonly #byModId = $derived(
		Map.groupBy(this.list, (notice) => notice.mod.id)
	);
	readonly counts = $derived(NoticesStore.countBy(this.list));
	readonly badgeCount = $derived(
		NOTICE_CATEGORIES.filter(
			(category) => NOTICE_CATEGORY_SPECS[category].isCounted
		).reduce((sum, category) => sum + this.counts[category], 0)
	);
	readonly hasDot = $derived(this.badgeCount === 0 && this.list.length > 0);
	readonly filterMod = $derived(
		this.#filterModId === null
			? null
			: this.#libraryStore.modById(this.#filterModId)
	);
	readonly detailsMod = $derived(
		this.#detailsModId === null
			? null
			: this.#libraryStore.modById(this.#detailsModId)
	);
	readonly shown = $derived.by((): readonly Notice[] => {
		const filterMod = this.filterMod;
		const query = this.search.trim().toLowerCase();
		if (!filterMod && !query) return this.list;
		return this.list.filter(
			(notice) =>
				(!filterMod || notice.mod === filterMod) &&
				(!query ||
					this.#libraryStore.searchTextOf(notice.mod).includes(query))
		);
	});
	readonly missingRequirements = $derived(
		this.list.flatMap((notice) =>
			notice.category === 'missing' ? notice.requirements : []
		)
	);
	readonly checkedAt = $derived(
		this.#gamesStore.current?.row?.scanned_at ?? null
	);
	readonly isChecking = $derived(this.#scanStore.isScanning);

	noticesOf(mod: Mod): readonly Notice[] {
		return this.#byModId.get(mod.id) ?? NO_NOTICES;
	}

	flagsOf(mod: Mod): NoticeCategory[] {
		const notices = this.noticesOf(mod);
		if (!notices.length) return NO_FLAGS;
		return NOTICE_CATEGORIES.filter((category) =>
			notices.some((notice) => notice.category === category)
		);
	}

	open(opening: NoticesOpening = {}): void {
		this.isOpen = true;
		this.#detailsModId = null;
		this.#filterModId = opening.mod?.id ?? null;
		this.collapsed.clear();
		if (opening.category)
			for (const category of NOTICE_CATEGORIES)
				if (category !== opening.category) this.collapsed.add(category);
		if (opening.mod) this.tab = 'all';
	}

	toggleCollapsed(category: NoticeCategory): void {
		if (this.collapsed.has(category)) this.collapsed.delete(category);
		else this.collapsed.add(category);
	}

	close(): void {
		this.isOpen = false;
		this.#filterModId = null;
		this.#detailsModId = null;
		this.search = '';
	}

	toggle(): void {
		if (this.isOpen) this.close();
		else this.open();
	}

	clearFilter(): void {
		this.#filterModId = null;
	}

	openDetails(mod: Mod): void {
		this.#detailsModId = mod.id;
	}

	closeDetails(): void {
		this.#detailsModId = null;
	}

	unregisterTable(table: LocateTarget): void {
		if (this.#pageTable === table) this.#pageTable = null;
	}

	registerTable(table: LocateTarget): void {
		this.#pageTable = table;
		const pending = this.#pendingLocate;
		if (!pending) return;
		this.#pendingLocate = null;
		void tick().then(() => table.locate(pending.modId, pending.color));
	}

	locate(notice: Notice): void {
		const color = NOTICE_CATEGORY_SPECS[notice.category].color;
		if (this.#pageTable?.locate(notice.mod.id, color)) return;
		this.#pendingLocate = { modId: notice.mod.id, color };
		void goto('/library');
	}

	isWorking(notice: MissingNotice): boolean {
		return this.#downloadsStore.pending.some((item) =>
			notice.requirements.some(
				(requirement) => requirement.required_ref === item.source_ref
			)
		);
	}

	toSubscribe(requirements: readonly ModDependency[]): ModDependency[] {
		const pending = this.#downloadsStore.pending.map(
			(item) => item.source_ref
		);
		const refs: string[] = [];
		return requirements.filter((requirement) => {
			const ref = requirement.required_ref;
			if (refs.includes(ref) || pending.includes(ref)) return false;
			refs.push(ref);
			return true;
		});
	}

	async subscribe(requirements: readonly ModDependency[]): Promise<void> {
		const items = this.toSubscribe(requirements).map((requirement) => ({
			source_ref: requirement.required_ref,
			title: requirement.required_title ?? requirement.required_ref,
		}));
		if (items.length) await this.#downloadsStore.subscribe(items);
	}

	async markSeen(mod: Mod): Promise<void> {
		const seenAt = mod.seen_updated_at;
		await this.#libraryStore.markSeen([mod]);
		toast(t('notices.steam.seenToast', { title: mod.displayTitle }), {
			action: {
				label: t('common.undo'),
				onClick: () => void this.#libraryStore.restoreSeen(mod, seenAt),
			},
		});
	}

	async markAllSeen(): Promise<void> {
		await this.#libraryStore.markSeen(
			this.list.flatMap((notice) =>
				notice.category === 'steam' ? [notice.mod] : []
			)
		);
	}

	async moveToFix(notice: OrderNotice): Promise<void> {
		const moved = this.#slotsByModId[notice.mod.id];
		const target = this.#slotsByModId[notice.requirement.id];
		if (!moved || !target) return;
		if (moved.group && moved.group === target.group) {
			const ids = this.#groupsStore
				.modsOf(moved.group)
				.map(({ mod }) => mod.id)
				.filter((id) => id !== moved.mod.id);
			ids.splice(ids.indexOf(target.mod.id) + 1, 0, moved.mod.id);
			await this.#groupsStore.reorder(moved.group, ids);
			return;
		}
		if (moved.entry === target.entry) return;
		const entries = this.#libraryStore
			.entriesOf(this.#profilesStore.active!)
			.filter((entry) => entry !== moved.entry);
		const next = entries[entries.indexOf(target.entry) + 1];
		await moved.entry.update({
			position: keyBetween(target.entry.position, next?.position ?? null),
		});
	}

	async checkNow(): Promise<void> {
		await this.#scanStore.scan();
	}

	private static isBroken(mod: Mod): boolean {
		return mod.isMissing || mod.problem !== null;
	}

	private static countBy(
		notices: readonly Notice[]
	): Record<NoticeCategory, number> {
		const counts = Object.fromEntries(
			NOTICE_CATEGORIES.map((category) => [category, 0])
		) as Record<NoticeCategory, number>;
		for (const notice of notices) counts[notice.category]++;
		return counts;
	}
}
