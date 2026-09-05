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

/**
 * Whether the first-run wizard still owns the screen. The wizard runs from the
 * layout, which outlives every page under it, so a page has no other way to
 * tell that it is covered.
 */
export const OnboardingPresenceProvider = ({ children }: { children: ReactNode }) => {
  const [showing, setShowing] = useState(false);
  const value = useMemo(() => ({ showing, setShowing }), [showing]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};

/** For the gate itself, which is what knows whether the wizard is open. */
export const useOnboardingPresence = (): Presence => useContext(PresenceContext);

/**
 * Whether a page should keep a dialog of its own to itself for now. True while
 * the profile is still loading, while onboarding is unanswered, and on through
 * the wizard's closing summary, which stays up after the profile is marked
 * done. Anything less and a new account meets two stacked dialogs.
 */
export const useFirstRunPending = (): boolean => {
  const { showing } = useContext(PresenceContext);
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: profileApi.get });

  return showing || !profile.isSuccess || profile.data.onboardingCompletedAt === null;
};
