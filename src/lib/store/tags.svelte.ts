import { ConnectionStore } from '@7otion-tauri/orm';

import { Tag, type TagColor } from '@/lib/models';
import { GamesStore } from '@/lib/store';

export class TagsStore extends ConnectionStore {
	readonly #gamesStore = GamesStore.get();
	readonly #tags = this.query(() =>
		Tag.query()
			.where('game_id', this.#gamesStore.current?.app_id ?? 0)
			.orderBy('name')
	);

	readonly list = $derived(this.#tags.rows);

	isNameTaken(name: string, except?: Tag): boolean {
		const wanted = name.trim().toLowerCase();
		return this.list.some(
			(tag) => tag !== except && tag.name.toLowerCase() === wanted
		);
	}

	async create(name: string, color: TagColor = 'ash'): Promise<Tag> {
		return await Tag.create({
			game_id: this.#gamesStore.current!.app_id,
			name: name.trim(),
			color,
		});
	}

	async rename(tag: Tag, name: string): Promise<void> {
		await tag.update({ name: name.trim() });
	}

	async recolor(tag: Tag, color: TagColor): Promise<void> {
		await tag.update({ color });
	}

	async delete(tag: Tag): Promise<void> {
		await tag.delete();
	}
}
