'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { LOCALES, type Locale } from '@/i18n/config';
import { persistLocale } from '@/i18n/persist-locale';
import { cn } from '@/lib/utils/cn';

export const LanguageToggle = ({ className }: { className?: string }) => {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations('settings');

  const change = (next: Locale) => {
    persistLocale(next);
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      aria-busy={pending}
      className={cn(
        'border-border bg-surface-muted inline-flex gap-0.5 rounded-md border p-0.5',
        className,
      )}
    >
      {LOCALES.map((value) => {
        const selected = value === locale;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => change(value)}
            className={cn(
              'press rounded-[0.3rem] px-2 py-1.5 text-[0.6875rem] font-semibold tracking-wide uppercase',
              selected
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-foreground-subtle hover:text-foreground',
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
};
