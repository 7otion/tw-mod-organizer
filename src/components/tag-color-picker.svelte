<script lang="ts">
	import ColorPicker from '@/lib/color-picker.svelte';
	import { t } from '@/lib/i18n';
	import { TAG_PRESETS, type TagColor } from '@/lib/models';
	import { tagColor } from '@/lib/tag-swatches';

	type Props = {
		color: TagColor;
		onpick: (color: TagColor) => void;
	};

	let { color, onpick }: Props = $props();

	const presets = $derived(
		TAG_PRESETS.map((preset) => ({
			value: preset,
			label: t(`tags.colors.${preset}`),
			color: tagColor(preset),
		}))
	);
</script>

<ColorPicker {presets} {color} {onpick} />
