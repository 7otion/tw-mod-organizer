const DATE_TOKEN = /'[^']*'|d{1,4}|M{1,4}|y{1,5}/g;

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 31_536_000],
	['month', 2_592_000],
	['week', 604_800],
	['day', 86_400],
	['hour', 3_600],
	['minute', 60],
];

export class DateFormatter {
	readonly #monthNames: Intl.DateTimeFormat;
	readonly #longMonthNames: Intl.DateTimeFormat;
	readonly #monthNamesAlone: Intl.DateTimeFormat;
	readonly #longMonthNamesAlone: Intl.DateTimeFormat;
	readonly #dayNames: Intl.DateTimeFormat;
	readonly #longDayNames: Intl.DateTimeFormat;
	readonly #relative: Intl.RelativeTimeFormat;

	constructor(locale: string) {
		this.#monthNames = new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'short',
		});
		this.#longMonthNames = new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'long',
		});
		this.#monthNamesAlone = new Intl.DateTimeFormat(locale, {
			month: 'short',
		});
		this.#longMonthNamesAlone = new Intl.DateTimeFormat(locale, {
			month: 'long',
		});
		this.#dayNames = new Intl.DateTimeFormat(locale, { weekday: 'short' });
		this.#longDayNames = new Intl.DateTimeFormat(locale, {
			weekday: 'long',
		});
		this.#relative = new Intl.RelativeTimeFormat(locale, {
			numeric: 'auto',
		});
	}

	format(date: Date, pattern: string): string {
		return pattern.replace(DATE_TOKEN, (token) => {
			switch (token) {
				case 'd':
					return String(date.getDate());
				case 'dd':
					return DateFormatter.pad(date.getDate());
				case 'ddd':
					return this.#dayNames.format(date);
				case 'dddd':
					return this.#longDayNames.format(date);
				case 'M':
					return String(date.getMonth() + 1);
				case 'MM':
					return DateFormatter.pad(date.getMonth() + 1);
				case 'MMM':
					return DateFormatter.monthOf(
						this.#monthNames,
						this.#monthNamesAlone,
						date
					);
				case 'MMMM':
					return DateFormatter.monthOf(
						this.#longMonthNames,
						this.#longMonthNamesAlone,
						date
					);
				case 'y':
					return String(date.getFullYear() % 100);
				case 'yy':
					return DateFormatter.pad(date.getFullYear() % 100);
				default:
					return token.startsWith("'")
						? token.slice(1, -1)
						: String(date.getFullYear());
			}
		});
	}

	timeAgo(date: Date): string {
		const seconds = (Date.now() - date.getTime()) / 1000;
		const unit = TIME_UNITS.find(([, size]) => seconds >= size);
		if (!unit) return this.#relative.format(0, 'second');
		return this.#relative.format(-Math.floor(seconds / unit[1]), unit[0]);
	}

	private static monthOf(
		inDate: Intl.DateTimeFormat,
		alone: Intl.DateTimeFormat,
		date: Date
	): string {
		const month = inDate
			.formatToParts(date)
			.find((part) => part.type === 'month')?.value;
		return month && !/^\d+$/.test(month) ? month : alone.format(date);
	}

	private static pad(value: number): string {
		return String(value).padStart(2, '0');
	}
}
