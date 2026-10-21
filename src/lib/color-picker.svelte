<script lang="ts" generics="T extends string">
	import { untrack } from 'svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import { Input } from '@/components/ui/input';
	import { Slider } from '@/components/ui/slider';

	import {
		type ColorPreset,
		type Hex,
		hexToHsl,
		hslToHex,
		isHex,
		MAX_LIGHTNESS,
		MIN_LIGHTNESS,
		readableColor,
	} from '@/lib/color';
	import { t } from '@/lib/i18n';
	import { cn } from '@/lib/utils';

	type Props = {
		presets: readonly ColorPreset<T>[];
		color: T | Hex;
		onpick: (color: T | Hex) => void;
		minLightness?: number;
	};

	const DEFAULT_CUSTOM: Hex = '#d98cff';
	const DEFAULT_SATURATION = 0.7;
	const SLIDER_CLASS =
		'[&_[data-slot=slider-range]]:hidden [&_[data-slot=slider-thumb]]:bg-(--draft) [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-(image:--track)';
	const HUE_TRACK = `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360]
		.map((hue) => `hsl(${hue} 70% 60%)`)
		.join(', ')})`;

	let {
		presets,
		color,
		onpick,
		minLightness = MIN_LIGHTNESS,
	}: Props = $props();

	let isCustomOpen = $state(false);
	let draft = $state<Hex>(
		untrack(() => (isHex(color) ? color : DEFAULT_CUSTOM))
	);
	let hexText = $state(untrack(() => draft));
	let wasLightened = $state(false);

	const isCustom = $derived(isCustomOpen || isHex(color));
	const hsl = $derived(hexToHsl(draft));
	const lightnessTrack = $derived(
		`linear-gradient(90deg, ${hslToHex({ ...hsl, lightness: minLightness })}, ${hslToHex({ ...hsl, lightness: MAX_LIGHTNESS })})`
	);

	function pickPreset(preset: T): void {
		isCustomOpen = false;
		if (preset !== color) onpick(preset);
	}

	function openCustom(): void {
		isCustomOpen = true;
		commitDraft();
	}

	function setHue(hue: number): void {
		draft = hslToHex({
			hue,
			saturation: hsl.saturation || DEFAULT_SATURATION,
			lightness: hsl.lightness,
		});
		hexText = draft;
	}

	function setLightness(lightness: number): void {
		draft = hslToHex({
			hue: hsl.hue,
			saturation: hsl.saturation || DEFAULT_SATURATION,
			lightness,
		});
		hexText = draft;
	}

	function commitHex(): void {
		const text = hexText.trim().toLowerCase();
		const hex = text.startsWith('#') ? text : `#${text}`;
		if (!isHex(hex)) {
			hexText = draft;
			return;
		}
		draft = hex;
		commitDraft();
	}

	function commitDraft(): void {
		const readable = readableColor(draft, minLightness);
		draft = readable.color;
		hexText = draft;
		wasLightened = readable.wasLightened;
		if (draft !== color) onpick(draft);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="grid w-fit grid-cols-5 gap-1">
		{#each presets as preset (preset.value)}
			<button
				type="button"
				aria-label={preset.label}
				aria-pressed={!isCustom && preset.value === color}
				class={cn(
					'grid size-7 place-items-center rounded-full hover:bg-fill-2',
					!isCustom && preset.value === color && 'bg-fill-3'
				)}
				onclick={() => pickPreset(preset.value)}
			>
				<span
					class="size-3 rounded-full"
					style:background-color={preset.color}
				></span>
			</button>
		{/each}
		<button
			type="button"
			aria-label={t('colorPicker.custom')}
			aria-pressed={isCustom}
			class={cn(
				'grid size-7 place-items-center rounded-full hover:bg-fill-2',
				isCustom && 'bg-fill-3'
			)}
			onclick={openCustom}
		>
			{#if isCustom}
				<span class="size-3 rounded-full" style:background-color={draft}
				></span>
			{:else}
				<PlusIcon class="size-3.5 text-muted-foreground" />
			{/if}
		</button>
	</div>
	{#if isCustom}
		<div
			class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm"
		>
			<span class="text-muted-foreground">{t('colorPicker.hex')}</span>
			<Input
				bind:value={hexText}
				aria-label={t('colorPicker.hex')}
				class="h-7 w-28 font-mono"
				spellcheck={false}
				onblur={commitHex}
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						commitHex();
					}
				}}
			/>
			<span class="text-muted-foreground">{t('colorPicker.hue')}</span>
			<Slider
				type="single"
				value={hsl.hue}
				min={0}
				max={360}
				step={1}
				class={SLIDER_CLASS}
				style="--track: {HUE_TRACK}; --draft: {draft}"
				onValueChange={setHue}
				onValueCommit={commitDraft}
			/>
			<span class="text-muted-foreground">
				{t('colorPicker.lightness')}
			</span>
			<Slider
				type="single"
				value={Math.round(hsl.lightness * 100)}
				min={minLightness * 100}
				max={MAX_LIGHTNESS * 100}
				step={1}
				class={SLIDER_CLASS}
				style="--track: {lightnessTrack}; --draft: {draft}"
				onValueChange={(value) => setLightness(value / 100)}
				onValueCommit={commitDraft}
			/>
		</div>
		{#if wasLightened}
			<p class="text-xs text-muted-foreground">
				{t('colorPicker.lightened')}
			</p>
		{/if}
	{/if}
</div>
