<script lang="ts">
	import type { Snippet } from 'svelte';

	import { messageParts } from './index';
	import type { MessageKey } from './message-key';
	import type { MessageValues } from './messages';

	type Props = {
		key: MessageKey;
		values?: MessageValues;
		value: Snippet<[string, string]>;
	};

	let { key, values, value }: Props = $props();

	const parts = $derived(messageParts(key, values));
</script>

<!-- prettier-ignore -->
{#each parts as part, index (index)}{#if part.name}{@render value(part.text, part.name)}{:else}{part.text}{/if}{/each}
