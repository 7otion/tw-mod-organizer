export type TextStyle = 'bold' | 'italic' | 'underline' | 'strike';

export type DescriptionNode =
	| { kind: 'text'; text: string }
	| { kind: 'style'; style: TextStyle; children: DescriptionNode[] }
	| { kind: 'link'; url: string; children: DescriptionNode[] }
	| { kind: 'paragraph'; children: DescriptionNode[] }
	| { kind: 'heading'; level: 1 | 2 | 3; children: DescriptionNode[] }
	| { kind: 'list'; isOrdered: boolean; items: DescriptionNode[][] }
	| { kind: 'quote'; author: string | null; children: DescriptionNode[] }
	| { kind: 'code'; text: string }
	| { kind: 'image'; url: string }
	| { kind: 'rule' };

type Token =
	| { type: 'open'; tag: string; argument: string | null }
	| { type: 'close'; tag: string }
	| { type: 'text'; text: string };

const TAGS = /\[(\/?)([a-z*][a-z0-9]*)(?:=([^\]]*))?\]/gi;
const PARAGRAPH_BREAK = /\n[ \t]*\n/;
const BARE_URLS = /https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]]/g;
const WEB_ADDRESS = /^https?:\/\//i;
const CLAN_IMAGE = '{STEAM_CLAN_IMAGE}';
const CLAN_IMAGE_HOST = 'https://clan.akamai.steamstatic.com/images';
const STYLES: Record<string, TextStyle> = {
	b: 'bold',
	i: 'italic',
	u: 'underline',
	strike: 'strike',
	s: 'strike',
};
const HEADINGS: Record<string, 1 | 2 | 3> = { h1: 1, h2: 2, h3: 3 };
const BLOCK_TAGS = ['list', 'olist', 'quote', 'code', 'hr', 'img'];

export function readDescription(source: string): DescriptionNode[] {
	const tokens = tokenize(source.replace(/\r\n?/g, '\n'));
	return new Parser(tokens).blocks();
}

function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let last = 0;
	for (const match of source.matchAll(TAGS)) {
		if (match.index > last)
			tokens.push({
				type: 'text',
				text: source.slice(last, match.index),
			});
		const [, slash, name, argument] = match;
		const tag = name.toLowerCase();
		if (slash) tokens.push({ type: 'close', tag });
		else tokens.push({ type: 'open', tag, argument: argument ?? null });
		last = match.index + match[0].length;
	}
	if (last < source.length)
		tokens.push({ type: 'text', text: source.slice(last) });
	return tokens;
}

class Parser {
	readonly #tokens: Token[];
	#at = 0;

	constructor(tokens: Token[]) {
		this.#tokens = tokens;
	}

	blocks(closing: string | null = null): DescriptionNode[] {
		const blocks: DescriptionNode[] = [];
		let inline: DescriptionNode[] = [];
		const flush = () => {
			for (const paragraph of Parser.paragraphs(inline))
				blocks.push({ kind: 'paragraph', children: paragraph });
			inline = [];
		};
		while (this.#at < this.#tokens.length) {
			const token = this.#tokens[this.#at];
			if (token.type === 'close' && token.tag === closing) {
				this.#at++;
				break;
			}
			if (token.type === 'open' && this.isBlock(token.tag)) {
				flush();
				this.#at++;
				const block = this.block(token.tag, token.argument);
				if (block) blocks.push(block);
				continue;
			}
			inline.push(...this.inline(closing));
		}
		flush();
		return blocks;
	}

	private isBlock(tag: string): boolean {
		return tag in HEADINGS || BLOCK_TAGS.includes(tag);
	}

	private block(
		tag: string,
		argument: string | null
	): DescriptionNode | null {
		if (tag in HEADINGS)
			return {
				kind: 'heading',
				level: HEADINGS[tag],
				children: Parser.paragraphs(this.inlineUntil(tag)).flat(),
			};
		if (tag === 'hr') return { kind: 'rule' };
		if (tag === 'img') {
			const url = this.rawUntil('img').trim();
			const resolved = url.startsWith(CLAN_IMAGE)
				? CLAN_IMAGE_HOST + url.slice(CLAN_IMAGE.length)
				: url;
			return WEB_ADDRESS.test(resolved)
				? { kind: 'image', url: resolved }
				: null;
		}
		if (tag === 'code')
			return { kind: 'code', text: this.rawUntil('code') };
		if (tag === 'quote')
			return {
				kind: 'quote',
				author: argument?.trim() || null,
				children: this.blocks('quote'),
			};
		return {
			kind: 'list',
			isOrdered: tag === 'olist',
			items: this.items(tag),
		};
	}

	private items(tag: string): DescriptionNode[][] {
		const items: DescriptionNode[][] = [];
		let current: DescriptionNode[] | null = null;
		while (this.#at < this.#tokens.length) {
			const token = this.#tokens[this.#at];
			if (token.type === 'close' && token.tag === tag) {
				this.#at++;
				break;
			}
			if (token.type === 'open' && token.tag === '*') {
				this.#at++;
				current = [];
				items.push(current);
				continue;
			}
			if (token.type === 'close' && token.tag === '*') {
				this.#at++;
				current = null;
				continue;
			}
			const nodes = this.inline(tag);
			if (current) current.push(...nodes);
			else if (nodes.some((node) => Parser.hasText(node))) {
				current = [...nodes];
				items.push(current);
			}
		}
		return items.map((item) => Parser.trimmed(item));
	}

	private inlineUntil(tag: string): DescriptionNode[] {
		const nodes: DescriptionNode[] = [];
		while (this.#at < this.#tokens.length) {
			const token = this.#tokens[this.#at];
			if (token.type === 'close' && token.tag === tag) {
				this.#at++;
				break;
			}
			nodes.push(...this.inline(tag));
		}
		return nodes;
	}

	private rawUntil(tag: string): string {
		let text = '';
		while (this.#at < this.#tokens.length) {
			const token = this.#tokens[this.#at++];
			if (token.type === 'close' && token.tag === tag) break;
			text += Parser.source(token);
		}
		return text;
	}

	private inline(closing: string | null): DescriptionNode[] {
		const token = this.#tokens[this.#at++];
		if (token.type === 'text') return Parser.linked(token.text);
		if (token.type === 'close') return [];
		if (token.tag in STYLES)
			return [
				{
					kind: 'style',
					style: STYLES[token.tag],
					children: this.inlineUntil(token.tag),
				},
			];
		if (token.tag === 'url') {
			const children = this.inlineUntil('url');
			const url = (token.argument ?? Parser.plain(children)).trim();
			return WEB_ADDRESS.test(url)
				? [{ kind: 'link', url, children }]
				: children;
		}
		if (token.tag === 'noparse')
			return [{ kind: 'text', text: this.rawUntil('noparse') }];
		if (this.isBlock(token.tag)) {
			this.#at--;
			return [];
		}
		void closing;
		return [];
	}

	private static linked(text: string): DescriptionNode[] {
		const nodes: DescriptionNode[] = [];
		let last = 0;
		for (const match of text.matchAll(BARE_URLS)) {
			if (match.index > last)
				nodes.push({
					kind: 'text',
					text: text.slice(last, match.index),
				});
			nodes.push({
				kind: 'link',
				url: match[0],
				children: [{ kind: 'text', text: match[0] }],
			});
			last = match.index + match[0].length;
		}
		if (last < text.length)
			nodes.push({ kind: 'text', text: text.slice(last) });
		return nodes;
	}

	private static paragraphs(nodes: DescriptionNode[]): DescriptionNode[][] {
		const paragraphs: DescriptionNode[][] = [];
		let current: DescriptionNode[] = [];
		for (const node of nodes) {
			if (node.kind !== 'text' || !PARAGRAPH_BREAK.test(node.text)) {
				current.push(node);
				continue;
			}
			const pieces = node.text.split(PARAGRAPH_BREAK);
			pieces.forEach((piece, index) => {
				if (index > 0) {
					paragraphs.push(current);
					current = [];
				}
				if (piece) current.push({ kind: 'text', text: piece });
			});
		}
		paragraphs.push(current);
		return paragraphs
			.map((paragraph) => Parser.trimmed(paragraph))
			.filter((paragraph) =>
				paragraph.some((node) => Parser.hasText(node))
			);
	}

	private static trimmed(nodes: DescriptionNode[]): DescriptionNode[] {
		const trimmed = [...nodes];
		const first = trimmed[0];
		if (first?.kind === 'text')
			trimmed[0] = { ...first, text: first.text.trimStart() };
		const last = trimmed.at(-1);
		if (last?.kind === 'text')
			trimmed[trimmed.length - 1] = {
				...last,
				text: last.text.trimEnd(),
			};
		return trimmed.filter(
			(node) => node.kind !== 'text' || node.text.length
		);
	}

	private static hasText(node: DescriptionNode): boolean {
		switch (node.kind) {
			case 'text':
				return node.text.trim().length > 0;
			case 'style':
			case 'link':
			case 'paragraph':
			case 'heading':
			case 'quote':
				return node.children.some((child) => Parser.hasText(child));
			case 'list':
				return node.items.length > 0;
			case 'code':
				return node.text.trim().length > 0;
			case 'image':
			case 'rule':
				return true;
		}
	}

	private static plain(nodes: DescriptionNode[]): string {
		return nodes
			.map((node) => {
				switch (node.kind) {
					case 'text':
					case 'code':
						return node.text;
					case 'style':
					case 'link':
					case 'paragraph':
					case 'heading':
					case 'quote':
						return Parser.plain(node.children);
					case 'list':
						return node.items
							.map((item) => Parser.plain(item))
							.join('\n');
					case 'image':
					case 'rule':
						return '';
				}
			})
			.join('');
	}

	private static source(token: Token): string {
		if (token.type === 'text') return token.text;
		if (token.type === 'close') return `[/${token.tag}]`;
		return token.argument === null
			? `[${token.tag}]`
			: `[${token.tag}=${token.argument}]`;
	}
}
