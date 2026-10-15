<script lang="ts">
	import {
		Toaster as Sonner,
		type ToasterProps as SonnerProps,
	} from 'svelte-sonner';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { Spinner } from '@/components/ui/spinner';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme="dark"
	class="toaster group"
	style="--normal-bg: var(--bg-raised); --normal-text: var(--text-1); --normal-border: var(--line-strong); --border-radius: 0px;"
	toastOptions={{
		classes: {
			toast: 'cn-toast gap-3! text-sm! shadow-pop!',
			description: 'text-xs! text-muted-foreground!',
			success: 'border-[#1d4a3c]!',
			warning: 'border-[#5a4520]!',
			error: 'border-[#5a2530]! bg-[#170a0e]!',
		},
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Spinner class="size-3.5" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-[18px] text-gem-emerald" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-[18px] text-gem-blood" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-[18px] text-gem-sapphire" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-[18px] text-gem-gold" />
	{/snippet}
</Sonner>
