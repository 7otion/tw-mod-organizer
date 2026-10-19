export type Hex = `#${string}`;

export type Hsl = {
	hue: number;
	saturation: number;
	lightness: number;
};

export type ColorPreset<T extends string> = {
	value: T;
	label: string;
	color: string;
};

export const MIN_LIGHTNESS = 0.55;
export const MAX_LIGHTNESS = 0.95;

const HEX = /^#[0-9a-f]{6}$/;

export function isHex(value: string): value is Hex {
	return HEX.test(value);
}

export function readableColor(
	hex: Hex,
	minLightness = MIN_LIGHTNESS
): { color: Hex; wasLightened: boolean } {
	const hsl = hexToHsl(hex);
	if (hsl.lightness >= minLightness)
		return { color: hex, wasLightened: false };
	return {
		color: hslToHex({ ...hsl, lightness: minLightness }),
		wasLightened: true,
	};
}

export function hexToHsl(hex: Hex): Hsl {
	const red = parseInt(hex.slice(1, 3), 16) / 255;
	const green = parseInt(hex.slice(3, 5), 16) / 255;
	const blue = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const lightness = (max + min) / 2;
	const delta = max - min;
	if (delta === 0) return { hue: 0, saturation: 0, lightness };
	const saturation = delta / (1 - Math.abs(2 * lightness - 1));
	let hue: number;
	if (max === red) hue = ((green - blue) / delta) % 6;
	else if (max === green) hue = (blue - red) / delta + 2;
	else hue = (red - green) / delta + 4;
	hue = Math.round(hue * 60);
	if (hue < 0) hue += 360;
	return { hue, saturation, lightness };
}

export function hslToHex({ hue, saturation, lightness }: Hsl): Hex {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const match = lightness - chroma / 2;
	const [red, green, blue] =
		hue < 60
			? [chroma, second, 0]
			: hue < 120
				? [second, chroma, 0]
				: hue < 180
					? [0, chroma, second]
					: hue < 240
						? [0, second, chroma]
						: hue < 300
							? [second, 0, chroma]
							: [chroma, 0, second];
	const channel = (value: number) =>
		Math.round((value + match) * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${channel(red)}${channel(green)}${channel(blue)}`;
}
