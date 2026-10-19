import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { parse } from 'smol-toml';
import type { Plugin } from 'vite';

import { readLanguagePack } from './messages.ts';

const ENGLISH_FILE = fileURLToPath(
	new URL('./languages/en.toml', import.meta.url)
);
const MESSAGE_KEY_FILE = fileURLToPath(
	new URL('./message-key.ts', import.meta.url)
);

export function languagePacks(): Plugin {
	return {
		name: 'tmo-language-packs',
		buildStart() {
			writeMessageKeys();
		},
		transform(code, id) {
			if (!id.endsWith('.toml')) return null;
			const json = JSON.stringify(parse(code));
			return {
				code: `export default JSON.parse(${JSON.stringify(json)});`,
				map: null,
			};
		},
		handleHotUpdate({ file }) {
			if (file === ENGLISH_FILE) writeMessageKeys();
		},
	};
}

export function writeMessageKeys(): void {
	const english = readLanguagePack(parse(readFileSync(ENGLISH_FILE, 'utf8')));
	const keys = Object.keys(english.messages).sort();
	const union = keys.length
		? keys.map((key) => `\n\t| '${key}'`).join('')
		: ' never';
	const source = `// Generated from languages/en.toml. Edit that file, not this one.\nexport type MessageKey =${union};\n`;
	const current = existsSync(MESSAGE_KEY_FILE)
		? readFileSync(MESSAGE_KEY_FILE, 'utf8')
		: '';
	if (current !== source) writeFileSync(MESSAGE_KEY_FILE, source);
}
