'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { INTL_LOCALES, type Locale } from '@/i18n/config';

import {
  dayOffsetFromToday,
  formatFullDate,
  formatShortDate,
  formatWeekdayDate,
  formatTime,
} from './dates';
import {
  formatAxisKcal,
  formatDecimal,
  formatDistance,
  formatDuration,
  formatGrams,
  formatKcal,
  formatPercent,
  formatSignedKcal,
  formatSignedWeight,
  formatSpeed,
  formatWeight,
  type UnitLabels,
} from './units';

const RELATIVE_OFFSETS: Record<number, 'today' | 'yesterday' | 'tomorrow'> = {
  0: 'today',
  [-1]: 'yesterday',
  1: 'tomorrow',
};

export interface AppFormat {
  locale: string;
  kcal: (value: number) => string;
  axisKcal: (value: number) => string;
  signedKcal: (value: number) => string;
  grams: (value: number) => string;
  distance: (metres: number) => string;
  duration: (seconds: number) => string;
  speed: (kmh: number) => string;
  decimal: (value: number) => string;
  weight: (kilograms: number) => string;
  signedWeight: (kilograms: number) => string;
  percent: (ratio: number) => string;
  dayLabel: (date: string, timeZone: string) => string;
  isRelativeDay: (date: string, timeZone: string) => boolean;
  fullDate: (date: string) => string;
  shortDate: (date: string) => string;
  time: (isoInstant: string, timeZone: string) => string;
}

export const useFormat = (): AppFormat => {
  const locale = useLocale() as Locale;
  const units = useTranslations('units');
  const day = useTranslations('day');
  const intlLocale = INTL_LOCALES[locale] ?? INTL_LOCALES.en;

  const labels = useMemo<UnitLabels>(
    () => ({
      metre: units('metre'),
      kilometre: units('kilometre'),
      gram: units('gram'),
      minute: units('minute'),
      hour: units('hour'),
      second: units('second'),
      speed: units('speed'),
    }),
    [units],
  );

  return useMemo<AppFormat>(
    () => ({
      locale: intlLocale,
      kcal: (value) => formatKcal(value, intlLocale),
      axisKcal: (value) => formatAxisKcal(value, intlLocale),
      signedKcal: (value) => formatSignedKcal(value, intlLocale),
      grams: (value) => formatGrams(value, intlLocale, labels),
      distance: (metres) => formatDistance(metres, intlLocale, labels),
      duration: (seconds) => formatDuration(seconds, labels),
      speed: (kmh) => formatSpeed(kmh, intlLocale, labels),
      decimal: (value) => formatDecimal(value, intlLocale),
      weight: (kilograms) => formatWeight(kilograms, intlLocale),
      signedWeight: (kilograms) => formatSignedWeight(kilograms, intlLocale),
      percent: (ratio) => formatPercent(ratio, intlLocale),
      dayLabel: (date, timeZone) => {
        const relative = RELATIVE_OFFSETS[dayOffsetFromToday(date, timeZone)];

        return relative ? day(relative) : formatWeekdayDate(date, intlLocale);
      },
      isRelativeDay: (date, timeZone) =>
        RELATIVE_OFFSETS[dayOffsetFromToday(date, timeZone)] !== undefined,
      fullDate: (date) => formatFullDate(date, intlLocale),
      shortDate: (date) => formatShortDate(date, intlLocale),
      time: (isoInstant, timeZone) => formatTime(isoInstant, timeZone, intlLocale),
    }),
    [intlLocale, labels, day],
  );
};
