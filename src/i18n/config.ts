export const LOCALES = ['en', 'ru', 'uk'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE = 'sc_locale';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
};

export const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uk: 'uk-UA',
};

export const isLocale = (value: string | undefined): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
