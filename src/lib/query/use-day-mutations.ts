'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { DAY_SCOPED_KEYS } from './query-keys';

export const useInvalidateDay = (): (() => Promise<void>) => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all(
      DAY_SCOPED_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  }, [queryClient]);
};
