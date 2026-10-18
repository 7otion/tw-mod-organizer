import type { TagColor } from '@/lib/models';

export const TAG_SWATCHES: Record<TagColor, string> = {
	ash: 'bg-muted-foreground',
	pink: 'bg-pink',
	blood: 'bg-status-missing',
	ember: 'bg-status-lose',
	gold: 'bg-status-win',
	emerald: 'bg-status-ok',
	sapphire: 'bg-status-update',
	amethyst: 'bg-status-dep',
};
