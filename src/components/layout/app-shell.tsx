'use client';

import {
  Activity,
  CalendarDays,
  History,
  LineChart,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils/cn';

type NavKey = 'today' | 'food' | 'activity' | 'progress' | 'history' | 'settings';

interface NavItem {
  href: Route;
  key: NavKey;
  icon: ComponentType<{ className?: string }>;
  inBottomNav: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', key: 'today', icon: CalendarDays, inBottomNav: true },
  { href: '/food', key: 'food', icon: UtensilsCrossed, inBottomNav: true },
  { href: '/activity', key: 'activity', icon: Activity, inBottomNav: true },
  { href: '/progress', key: 'progress', icon: LineChart, inBottomNav: true },
  { href: '/history', key: 'history', icon: History, inBottomNav: false },
  { href: '/settings', key: 'settings', icon: Settings, inBottomNav: true },
];

const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.inBottomNav);

const isActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const app = useTranslations('app');

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r px-3 py-5 lg:flex">
        <div className="px-3 pb-6">
          <Logo name={app('name')} tagline={app('tagline')} />
        </div>

        <nav aria-label={t('main')} className="flex-1">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
              const active = isActive(pathname, href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'press relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm',
                      active
                        ? 'bg-surface-muted text-foreground font-medium'
                        : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'bg-accent absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full transition-opacity duration-200',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon className="size-4" aria-hidden />
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-1">
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main
          key={pathname}
          className="animate-rise mx-auto w-full max-w-3xl px-5 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-16 xl:max-w-6xl"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label={t('main')}
        className="border-border bg-surface/90 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="flex">
          {BOTTOM_NAV_ITEMS.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);

            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'press flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium',
                    active ? 'text-accent' : 'text-foreground-subtle',
                  )}
                >
                  <span className="relative">
                    <Icon className="size-5" aria-hidden />
                    <span
                      aria-hidden
                      className={cn(
                        'bg-accent absolute -top-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full transition-opacity duration-200',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </span>
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
