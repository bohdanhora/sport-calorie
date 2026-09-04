'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiRequest, setAccessToken, setSessionLostHandler } from '@/lib/api/client';
import { authApi, type LoginInput, type RegisterInput } from '@/lib/api/endpoints';
import type { AuthResponse, SessionUser } from '@/lib/api/types';
import { detectTimeZone } from '@/lib/format/dates';
import { isLocale } from '@/i18n/config';
import { persistLocale, readLocaleCookie } from '@/i18n/persist-locale';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  timezone: string;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const applySession = useCallback(
    (session: AuthResponse) => {
      setAccessToken(session.accessToken);
      setUser(session.user);
      setStatus('authenticated');

      if (isLocale(session.user.locale) && session.user.locale !== readLocaleCookie()) {
        persistLocale(session.user.locale);
        router.refresh();
      }
    },
    [router],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const session = await apiRequest<AuthResponse>('/auth/refresh', {
          method: 'POST',
          skipAuthRetry: true,
        });

        if (active) {
          applySession(session);
        }
      } catch {
        if (active) {
          setAccessToken(null);
          setStatus('unauthenticated');
        }
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [applySession]);

  useEffect(() => {
    setSessionLostHandler(() => {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    });

    return () => setSessionLostHandler(null);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      applySession(await authApi.login(input));
      router.replace('/');
    },
    [applySession, router],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      applySession(await authApi.register({ timezone: detectTimeZone(), ...input }));
      router.replace('/');
    },
    [applySession, router],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      router.replace('/login');
    }
  }, [clearSession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      timezone: user?.timezone ?? detectTimeZone(),
      login,
      register,
      logout,
    }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
