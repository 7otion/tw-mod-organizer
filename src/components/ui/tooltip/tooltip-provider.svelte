<script lang="ts">
	import { Tooltip as TooltipPrimitive } from 'bits-ui';

	let { delayDuration = 500, ...restProps }: TooltipPrimitive.ProviderProps =
		$props();
</script>

<TooltipPrimitive.Provider {delayDuration} {...restProps} />
