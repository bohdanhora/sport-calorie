'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { OnboardingGate } from '@/components/onboarding/onboarding-gate';
import { OnboardingPresenceProvider } from '@/components/onboarding/onboarding-presence';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-provider';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-5 pt-8" aria-busy="true">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <OnboardingPresenceProvider>
      <AppShell>
        {children}
        <OnboardingGate />
      </AppShell>
    </OnboardingPresenceProvider>
  );
};

export default AppLayout;
