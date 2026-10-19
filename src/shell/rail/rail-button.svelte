<script lang="ts">
	import { Badge } from '@/components/ui/badge';
	import * as Tooltip from '@/components/ui/tooltip';

	import { t } from '@/lib/i18n';
	import type { NavRoute } from '@/lib/nav-routes';
	import { cn } from '@/lib/utils';

	type Props = {
		route: NavRoute;
		active: boolean;
		badge?: number;
	};

	let { route, active, badge }: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<a
				{...props}
				href={route.path}
				aria-label={t(route.labelKey)}
				aria-current={active ? 'page' : undefined}
				class={cn(
					'relative grid size-10 place-items-center rounded-shell text-muted-foreground outline-0 hover:bg-hover hover:text-foreground',
					active &&
						'bg-pink-deep/12 text-pink-deep hover:text-pink-deep'
				)}
			>
				<route.icon class="size-5" />
				{#if badge}
					<Badge
						class="absolute top-[3px] right-[2px] h-4 min-w-4 rounded-full bg-pink-deep px-[3px] text-2xs leading-none font-bold tracking-normal text-foreground tabular-nums"
					>
						{badge}
					</Badge>
				{/if}
			</a>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="right">
		{t(route.labelKey)} ({t('shortcuts.ctrlPlus', {
			key: route.shortcutKey,
		})})
	</Tooltip.Content>
</Tooltip.Root>
