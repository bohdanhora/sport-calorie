'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { OnboardingDialog } from '@/components/onboarding/onboarding-dialog';
import { useOnboardingPresence } from '@/components/onboarding/onboarding-presence';
import { profileApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/query-keys';

export const OnboardingGate = () => {
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: profileApi.get });
  const { setShowing } = useOnboardingPresence();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);

  const pending = profile.data?.onboardingCompletedAt === null;

  useEffect(() => {
    if (pending && !started) {
      setStarted(true);
      setOpen(true);
    }
  }, [pending, started]);

  useEffect(() => {
    setShowing(started && open);
  }, [started, open, setShowing]);

  if (!started) {
    return null;
  }

  return <OnboardingDialog open={open} onOpenChange={setOpen} profile={profile.data} />;
};
