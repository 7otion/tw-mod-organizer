import { LanguageStore } from '@/lib/store';

import type { MessageKey } from './message-key';
import type { MessagePart, MessageValues } from './messages';

let languageStore: LanguageStore | null = null;

function language(): LanguageStore {
	return (languageStore ??= LanguageStore.get());
}

export function t(key: MessageKey, values?: MessageValues): string {
	return language().t(key, values);
}

export function problemText(problem: string): string {
	return t(`problems.${problem}` as MessageKey);
}

export function messageParts(
	key: MessageKey,
	values?: MessageValues
): MessagePart[] {
	return language().parts(key, values);
}

export function formatSize(bytes: number): string {
	return language().formatSize(bytes);
}

export function formatDate(date: Date, pattern?: string): string {
	return language().formatDate(date, pattern);
}

export function timeAgo(date: Date): string {
	return language().timeAgo(date);
}

export function formatWhen(date: Date): string {
	const time = language().formatTime(date);
	switch (language().relativeDay(date)) {
		case 'today':
			return t('dates.todayAt', { time });
		case 'yesterday':
			return t('dates.yesterdayAt', { time });
		default:
			return t('dates.dayAt', { date: formatDate(date), time });
	}
}
