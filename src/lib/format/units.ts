const DEFAULT_LOCALE = 'en-US';

const METRES_PER_KILOMETRE = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MINUTES_PER_HOUR = 60;
const THOUSAND = 1000;

export interface UnitLabels {
  metre: string;
  kilometre: string;
  gram: string;
  minute: string;
  hour: string;
  second: string;
  speed: string;
}

export const EN_UNIT_LABELS: UnitLabels = {
  metre: 'm',
  kilometre: 'km',
  gram: 'g',
  minute: 'min',
  hour: 'h',
  second: 's',
  speed: 'km/h',
};

const integerFormatters = new Map<string, Intl.NumberFormat>();
const oneDecimalFormatters = new Map<string, Intl.NumberFormat>();

const integerFormatter = (locale: string): Intl.NumberFormat => {
  const cached = integerFormatters.get(locale);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  integerFormatters.set(locale, formatter);

  return formatter;
};

const oneDecimalFormatter = (locale: string): Intl.NumberFormat => {
  const cached = oneDecimalFormatters.get(locale);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  oneDecimalFormatters.set(locale, formatter);

  return formatter;
};

export const formatKcal = (value: number, locale = DEFAULT_LOCALE): string =>
  integerFormatter(locale).format(Math.round(value));

export const formatAxisKcal = (value: number, locale = DEFAULT_LOCALE): string =>
  value >= THOUSAND
    ? `${oneDecimalFormatter(locale).format(Math.round(value / 100) / 10)}k`
    : integerFormatter(locale).format(Math.round(value));

export const formatSignedKcal = (value: number, locale = DEFAULT_LOCALE): string => {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';

  return `${sign}${integerFormatter(locale).format(rounded)}`;
};

export const formatGrams = (
  value: number,
  locale = DEFAULT_LOCALE,
  labels: UnitLabels = EN_UNIT_LABELS,
): string => `${integerFormatter(locale).format(Math.round(value))} ${labels.gram}`;

export const formatDistance = (
  metres: number,
  locale = DEFAULT_LOCALE,
  labels: UnitLabels = EN_UNIT_LABELS,
): string => {
  if (metres < METRES_PER_KILOMETRE) {
    return `${integerFormatter(locale).format(Math.round(metres))} ${labels.metre}`;
  }

  const kilometres = Math.round((metres / METRES_PER_KILOMETRE) * 10) / 10;
  const value = Number.isInteger(kilometres)
    ? integerFormatter(locale).format(kilometres)
    : oneDecimalFormatter(locale).format(kilometres);

  return `${value} ${labels.kilometre}`;
};

export const formatDuration = (seconds: number, labels: UnitLabels = EN_UNIT_LABELS): string => {
  if (seconds <= 0) {
    return `0 ${labels.minute}`;
  }

  if (seconds < SECONDS_PER_MINUTE) {
    return `${Math.round(seconds)} ${labels.second}`;
  }

  const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE);

  if (totalMinutes < MINUTES_PER_HOUR) {
    return `${totalMinutes} ${labels.minute}`;
  }

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  return minutes === 0
    ? `${hours} ${labels.hour}`
    : `${hours} ${labels.hour} ${minutes} ${labels.minute}`;
};

export const formatDecimal = (value: number, locale = DEFAULT_LOCALE): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

export const formatWeight = (kilograms: number, locale = DEFAULT_LOCALE): string =>
  oneDecimalFormatter(locale).format(kilograms);

export const formatSignedWeight = (kilograms: number, locale = DEFAULT_LOCALE): string => {
  const sign = kilograms > 0 ? '+' : '';

  return `${sign}${oneDecimalFormatter(locale).format(kilograms)}`;
};

export const formatSpeed = (
  kmh: number,
  locale = DEFAULT_LOCALE,
  labels: UnitLabels = EN_UNIT_LABELS,
): string => `${oneDecimalFormatter(locale).format(kmh)} ${labels.speed}`;

export const formatPercent = (ratio: number, locale = DEFAULT_LOCALE): string =>
  `${integerFormatter(locale).format(Math.round(ratio * 100))}%`;

export const minutesToSeconds = (minutes: number): number =>
  Math.round(minutes * SECONDS_PER_MINUTE);

export const secondsToMinutes = (seconds: number): number =>
  Math.round((seconds / SECONDS_PER_MINUTE) * 10) / 10;

export const kilometresToMetres = (kilometres: number): number =>
  Math.round(kilometres * METRES_PER_KILOMETRE);

export const metresToKilometres = (metres: number): number =>
  Math.round((metres / METRES_PER_KILOMETRE) * 100) / 100;

export const secondsToHours = (seconds: number): number => seconds / SECONDS_PER_HOUR;
