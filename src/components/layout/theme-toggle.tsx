'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

const THEMES = [
  { value: 'light', key: 'light', icon: Sun },
  { value: 'system', key: 'system', icon: Monitor },
  { value: 'dark', key: 'dark', icon: Moon },
] as const;

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('theme');

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      className={cn(
        'border-border bg-surface-muted inline-flex gap-0.5 rounded-md border p-0.5',
        className,
      )}
    >
      {THEMES.map(({ value, key, icon: Icon }) => {
        const selected = mounted && theme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(key)}
            onClick={() => setTheme(value)}
            className={cn(
              'press rounded-[0.3rem] p-1.5',
              selected
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-foreground-subtle hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
};
