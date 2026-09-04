'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { ActivityType } from '@/lib/api/types';

export const useActivityTypeName = (): ((type: Pick<ActivityType, 'slug' | 'name'>) => string) => {
  const t = useTranslations('activityTypes');

  return useCallback((type) => (t.has(type.slug) ? t(type.slug) : type.name), [t]);
};
