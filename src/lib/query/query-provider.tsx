'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ApiError } from '@/lib/api/client';

const STALE_TIME_MS = 30_000;
const CLIENT_ERROR_FLOOR = 400;
const CLIENT_ERROR_CEILING = 500;

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (
    error instanceof ApiError &&
    error.status >= CLIENT_ERROR_FLOOR &&
    error.status < CLIENT_ERROR_CEILING
  ) {
    return false;
  }

  return failureCount < 2;
};

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME_MS,
            refetchOnWindowFocus: false,
            retry: shouldRetry,
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
