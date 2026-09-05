'use client';

import { Flame, LineChart, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAuth } from '@/lib/auth/auth-provider';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const t = useTranslations('auth');
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const points = [
    { icon: Flame, label: t('pitchBalance') },
    { icon: Timer, label: t('pitchLog') },
    { icon: LineChart, label: t('pitchProgress') },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="border-border bg-surface relative hidden overflow-hidden border-r p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="bg-accent pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full opacity-[0.07] blur-3xl"
        />
        <div
          aria-hidden
          className="bg-chart-2 pointer-events-none absolute -right-32 -bottom-40 size-[26rem] rounded-full opacity-[0.06] blur-3xl"
        />

        <p className="relative text-[0.9375rem] font-semibold tracking-tight">Sport Calorie</p>

        <div className="relative max-w-md space-y-8">
          <h2 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.02em]">
            {t('pitchTitle')}
          </h2>

          <ul className="space-y-4">
            {points.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="bg-accent-soft text-accent mt-px flex size-8 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-foreground-muted pt-1.5 text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-foreground-subtle relative text-xs">{t('pitchFooter')}</p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-5">
          <p className="text-[0.9375rem] font-semibold tracking-tight lg:invisible">Sport Calorie</p>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pt-2 pb-16 sm:items-center sm:pt-0">
          <div className="animate-rise border-border bg-surface-raised shadow-soft w-full max-w-sm rounded-lg border p-6 sm:p-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
