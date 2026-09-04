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

export const formatTime = (isoInstant: string, timeZone: string, locale = DEFAULT_LOCALE): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoInstant));

export const detectTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
