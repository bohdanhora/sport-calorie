const MS_PER_DAY = 86_400_000;
const DEFAULT_LOCALE = 'en-US';

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

const getDayFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = dayFormatters.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  dayFormatters.set(timeZone, formatter);

  return formatter;
};

export const todayIn = (timeZone: string, now = new Date()): string =>
  getDayFormatter(timeZone).format(now);

export const parseDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string =>
  toDateString(new Date(parseDate(date).getTime() + days * MS_PER_DAY));

export const differenceInDays = (from: string, to: string): number =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY);

export const isFuture = (date: string, timeZone: string, now = new Date()): boolean =>
  differenceInDays(todayIn(timeZone, now), date) > 0;

export const dayOffsetFromToday = (date: string, timeZone: string, now = new Date()): number =>
  differenceInDays(todayIn(timeZone, now), date);

export const formatFullDate = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseDate(date));

export const formatDateWithYear = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDate(date));

export const formatShortDate = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(parseDate(date));

export const formatWeekdayDate = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseDate(date));

export const startOfMonth = (date: string): string => `${date.slice(0, 7)}-01`;

export const addMonths = (date: string, months: number): string => {
  const current = parseDate(date);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth() + months;
  // The 0th day of the next month is the last of this one, which is how a 31st
  // asked to move to a 30-day month lands on the 30th instead of overflowing.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return toDateString(new Date(Date.UTC(year, month, Math.min(current.getUTCDate(), lastDay))));
};

export const isSameMonth = (a: string, b: string): boolean => a.slice(0, 7) === b.slice(0, 7);

/**
 * Six weeks of dates covering the month `date` falls in, padded at both ends
 * with the neighbouring months. Always 42 cells, so the grid does not change
 * height from one month to the next.
 */
export const buildMonthGrid = (date: string, weekStartsOn: 0 | 1 = 1): string[] => {
  const first = startOfMonth(date);
  const leading = (parseDate(first).getUTCDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -leading);

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

/** Only en of the three locales the app speaks puts Sunday first. */
export const weekStartsOnFor = (locale: string): 0 | 1 => (locale.startsWith('en') ? 0 : 1);

export const formatMonthYear = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(parseDate(date));

export const formatWeekdayNarrow = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'narrow' }).format(parseDate(date));

export const formatDayOfMonth = (date: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric' }).format(parseDate(date));

export const formatTime = (isoInstant: string, timeZone: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoInstant));

export const detectTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
