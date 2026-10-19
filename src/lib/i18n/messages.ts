export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
	other: string;
};
export type Message = string | PluralForms;
export type MessageValues = Readonly<Record<string, string | number>>;

export type LanguageInfo = {
	id: string;
	name: string;
	locale: string;
};

export type LanguagePack = {
	language: LanguageInfo;
	messages: Readonly<Record<string, Message>>;
};

export type MessagePart = {
	text: string;
	isValue: boolean;
};

type CompiledMessage = (values: MessageValues) => string;
type ValueFormatter = (value: string | number) => string;

const PLURAL_CATEGORIES: readonly string[] = [
	'zero',
	'one',
	'two',
	'few',
	'many',
	'other',
];
const PLACEHOLDERS = /\{(\w+)\}/g;
const LANGUAGE_ID = /^[A-Za-z0-9_-]{1,32}$/;

export class Translator {
	readonly #pack: LanguagePack;
	readonly #fallback: LanguagePack;
	readonly #plural: Intl.PluralRules;
	readonly #fallbackPlural: Intl.PluralRules;
	readonly #formatValue: ValueFormatter;
	readonly #compiled = new Map<string, CompiledMessage>();

	constructor(pack: LanguagePack, fallback: LanguagePack) {
		this.#pack = pack;
		this.#fallback = fallback;
		this.#plural = new Intl.PluralRules(pack.language.locale);
		this.#fallbackPlural = new Intl.PluralRules(fallback.language.locale);
		const numbers = new Intl.NumberFormat(pack.language.locale);
		this.#formatValue = (value) =>
			typeof value === 'number' ? numbers.format(value) : value;
	}

	translate(key: string, values: MessageValues = {}): string {
		let compiled = this.#compiled.get(key);
		if (!compiled) {
			compiled = this.compile(key);
			this.#compiled.set(key, compiled);
		}
		return compiled(values);
	}

	parts(key: string, values: MessageValues = {}): MessagePart[] {
		const [message, plural] = this.resolve(key);
		if (message === undefined) return [{ text: key, isValue: false }];
		const text =
			typeof message === 'string'
				? message
				: pickForm(message, plural, values);
		return text
			.split(PLACEHOLDERS)
			.flatMap((piece, index): MessagePart[] => {
				if (index % 2 === 0)
					return piece ? [{ text: piece, isValue: false }] : [];
				const value = values[piece];
				return [
					{
						text:
							value === undefined
								? `{${piece}}`
								: this.#formatValue(value),
						isValue: true,
					},
				];
			});
	}

	private compile(key: string): CompiledMessage {
		const [message, plural] = this.resolve(key);
		if (message === undefined) return () => key;
		return compileMessage(message, plural, this.#formatValue);
	}

	private resolve(key: string): [Message | undefined, Intl.PluralRules] {
		const own = this.#pack.messages[key];
		if (own !== undefined) return [own, this.#plural];
		return [this.#fallback.messages[key], this.#fallbackPlural];
	}
}

export function readLanguagePack(file: unknown): LanguagePack {
	if (!isTable(file))
		throw new Error('A language file must be a TOML table.');
	const { language, ...rest } = file;
	if (!isTable(language))
		throw new Error('The language file has no [language] table.');
	const { id, name, locale } = language;
	if (typeof id !== 'string' || !LANGUAGE_ID.test(id))
		throw new Error(
			'language.id must be 1–32 letters, digits, "-" or "_", such as "ru" or "pt-BR".'
		);
	if (typeof name !== 'string' || !name.trim())
		throw new Error('language.name must be the language’s own name.');
	if (typeof locale !== 'string' || !isLocale(locale))
		throw new Error(
			'language.locale must be a locale such as "ru-RU" or "zh-CN".'
		);
	const messages: Record<string, Message> = {};
	flatten(rest, '', messages);
	return { language: { id, name: name.trim(), locale }, messages };
}

export function coverage(pack: LanguagePack, english: LanguagePack): number {
	const keys = Object.keys(english.messages);
	if (!keys.length) return 1;
	return keys.filter((key) => key in pack.messages).length / keys.length;
}

function compileMessage(
	message: Message,
	plural: Intl.PluralRules,
	formatValue: ValueFormatter
): CompiledMessage {
	if (typeof message === 'string') return compileText(message, formatValue);
	const forms: Partial<Record<string, CompiledMessage>> = {};
	for (const [category, text] of Object.entries(message))
		if (text !== undefined)
			forms[category] = compileText(text, formatValue);
	const other = compileText(message.other, formatValue);
	return (values) =>
		(forms[plural.select(Number(values.count ?? 0))] ?? other)(values);
}

function pickForm(
	forms: PluralForms,
	plural: Intl.PluralRules,
	values: MessageValues
): string {
	return forms[plural.select(Number(values.count ?? 0))] ?? forms.other;
}

function compileText(
	text: string,
	formatValue: ValueFormatter
): CompiledMessage {
	const parts = text.split(PLACEHOLDERS);
	if (parts.length === 1) return () => text;
	return (values) => {
		let result = parts[0];
		for (let index = 1; index < parts.length; index += 2) {
			const name = parts[index];
			const value = values[name];
			result +=
				(value === undefined ? `{${name}}` : formatValue(value)) +
				parts[index + 1];
		}
		return result;
	};
}

function flatten(
	table: Readonly<Record<string, unknown>>,
	prefix: string,
	messages: Record<string, Message>
): void {
	for (const [name, value] of Object.entries(table)) {
		const key = prefix + name;
		if (typeof value === 'string') messages[key] = value;
		else if (isPluralForms(value)) messages[key] = value;
		else if (isTable(value)) flatten(value, `${key}.`, messages);
	}
}

function isPluralForms(value: unknown): value is PluralForms {
	return (
		isTable(value) &&
		typeof value.other === 'string' &&
		Object.entries(value).every(
			([category, text]) =>
				PLURAL_CATEGORIES.includes(category) && typeof text === 'string'
		)
	);
}

function isTable(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocale(locale: string): boolean {
	try {
		return Intl.getCanonicalLocales(locale).length === 1;
	} catch {
		return false;
	}
}
