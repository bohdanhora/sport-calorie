'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { profileApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/query-keys';

interface Presence {
  showing: boolean;
  setShowing: (showing: boolean) => void;
}

const PresenceContext = createContext<Presence>({ showing: false, setShowing: () => {} });

export const OnboardingPresenceProvider = ({ children }: { children: ReactNode }) => {
  const [showing, setShowing] = useState(false);
  const value = useMemo(() => ({ showing, setShowing }), [showing]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};

export const useOnboardingPresence = (): Presence => useContext(PresenceContext);

export const useFirstRunPending = (): boolean => {
  const { showing } = useContext(PresenceContext);
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: profileApi.get });

  return showing || !profile.isSuccess || profile.data.onboardingCompletedAt === null;
};
