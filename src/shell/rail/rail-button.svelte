<script lang="ts">
	import { Badge } from '@/components/ui/badge';
	import * as Tooltip from '@/components/ui/tooltip';

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
				aria-label={route.label}
				aria-current={active ? 'page' : undefined}
				class={cn(
					'relative grid size-10 place-items-center rounded-md text-muted-foreground outline-0 hover:bg-hover hover:text-foreground',
					active && 'bg-primary/12 text-primary hover:text-primary'
				)}
			>
				<route.icon class="size-5" />
				{#if badge}
					<Badge
						class="absolute top-[3px] right-[2px] min-w-4 rounded-full px-[3px] tracking-normal"
					>
						{badge}
					</Badge>
				{/if}
			</a>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="right">
		{route.label} ({route.shortcut})
	</Tooltip.Content>
</Tooltip.Root>
