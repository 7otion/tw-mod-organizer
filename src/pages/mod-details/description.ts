export type DescriptionPart = {
	text: string;
	url: string | null;
};

export type DescriptionParagraph = DescriptionPart[];

const LINK_START = '\u0001';
const LINK_LABEL = '\u0002';
const LINK_END = '\u0003';

const IMAGES = /\[img\][\s\S]*?\[\/img\]/gi;
const LIST_ITEMS = /\[\*\]/g;
const BLOCKS =
	/\[\/?(h[1-6]|hr|list|olist|quote|code|table|tr|noparse|spoiler)(=[^\]]*)?\]/gi;
const CELLS = /\[\/?(td|th)\]/gi;
const LABELLED_LINKS = /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi;
const PLAIN_LINKS = /\[url\]([\s\S]*?)\[\/url\]/gi;
const OTHER_TAGS = /\[\/?[a-z*]+(=[^\]]*)?\]/gi;
const PARAGRAPH_BREAK = /\n\s*\n/;
const LINKS_AND_URLS = new RegExp(
	`${LINK_START}([^${LINK_LABEL}]*)${LINK_LABEL}([^${LINK_END}]*)${LINK_END}|(https?://[^\\s<>"]*[^\\s<>".,;:!?)\\]])`,
	'g'
);
const WEB_ADDRESS = /^https?:\/\//i;

export function readDescription(source: string): DescriptionParagraph[] {
	const text = source
		.replace(/\r\n?/g, '\n')
		.replace(IMAGES, '')
		.replace(LIST_ITEMS, '\n• ')
		.replace(BLOCKS, '\n\n')
		.replace(CELLS, ' ')
		.replace(LABELLED_LINKS, (_, url: string, label: string) =>
			link(url.trim(), label)
		)
		.replace(PLAIN_LINKS, (_, url: string) => link(url.trim(), url.trim()))
		.replace(OTHER_TAGS, '');
	return text
		.split(PARAGRAPH_BREAK)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length)
		.map(readParagraph);
}

function link(url: string, label: string): string {
	const cleanLabel = label.replace(OTHER_TAGS, '').trim() || url;
	return WEB_ADDRESS.test(url)
		? `${LINK_START}${url}${LINK_LABEL}${cleanLabel}${LINK_END}`
		: cleanLabel;
}

function readParagraph(paragraph: string): DescriptionParagraph {
	const parts: DescriptionParagraph = [];
	let last = 0;
	for (const match of paragraph.matchAll(LINKS_AND_URLS)) {
		if (match.index > last)
			parts.push({ text: paragraph.slice(last, match.index), url: null });
		const [, url, label, bare] = match;
		parts.push(bare ? { text: bare, url: bare } : { text: label, url });
		last = match.index + match[0].length;
	}
	if (last < paragraph.length)
		parts.push({ text: paragraph.slice(last), url: null });
	return parts;
}
