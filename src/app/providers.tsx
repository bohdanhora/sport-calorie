'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { QueryProvider } from '@/lib/query/query-provider';

export const Providers = ({ children }: { children: ReactNode }) => {
  useKeyboardInset();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
};
