'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { todayIn } from '@/lib/format/dates';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const useSelectedDate = (timezone: string): [string, (date: string) => void] => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const param = searchParams.get('date');
  const date = param && DATE_PATTERN.test(param) ? param : todayIn(timezone);

  const setDate = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next === todayIn(timezone)) {
        params.delete('date');
      } else {
        params.set('date', next);
      }

      const query = params.toString();

      router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
    },
    [searchParams, router, pathname, timezone],
  );

  return [date, setDate];
};
