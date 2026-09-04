'use client';

import { LOCALE_COOKIE, type Locale } from './config';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const persistLocale = (locale: Locale): void => {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
};

export const readLocaleCookie = (): string | undefined =>
  document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.split('=')[1];
