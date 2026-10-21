<script lang="ts">
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import InfoIcon from '@lucide/svelte/icons/info';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import {
		Toaster as Sonner,
		type ToasterProps as SonnerProps,
	} from 'svelte-sonner';

	import { Spinner } from '@/components/ui/spinner';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme="dark"
	class="toaster group"
	style="--normal-bg: var(--surface-2); --normal-text: var(--text-1); --normal-border: transparent; --border-radius: 8px;"
	toastOptions={{
		classes: {
			toast: 'cn-toast gap-3! text-md! shadow-pop!',
			description: 'text-xs! text-muted-foreground!',
		},
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Spinner class="size-3.5" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-5 text-status-ok" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-5 text-status-missing" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-5 text-status-update" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-5 text-status-warn" />
	{/snippet}
</Sonner>
