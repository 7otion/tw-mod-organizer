import { isTagPreset, type TagColor, type TagPreset } from '@/lib/models';

const PRESET_VALUES: Record<TagPreset, string> = {
	ash: 'var(--text-3)',
	pink: 'var(--pink)',
	blood: 'var(--st-missing)',
	ember: 'var(--st-lose)',
	gold: 'var(--st-win)',
	emerald: 'var(--st-ok)',
	teal: 'var(--sep-teal)',
	sapphire: 'var(--st-update)',
	amethyst: 'var(--st-dep)',
};

export function tagColor(color: TagColor | null): string {
	if (color === null) return PRESET_VALUES.ash;
	return isTagPreset(color) ? PRESET_VALUES[color] : color;
}

export function tagTextColor(color: TagColor | null): string | undefined {
	return color === null || color === 'ash' ? undefined : tagColor(color);
}
