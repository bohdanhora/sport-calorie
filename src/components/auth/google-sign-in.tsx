'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-provider';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const MAX_BUTTON_WIDTH = 400;

interface CredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          shape?: 'rectangular' | 'pill';
          text?: 'signin_with' | 'signup_with' | 'continue_with';
          logo_alignment?: 'left' | 'center';
          width?: number;
        },
      ) => void;
      cancel: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

const loadGsiScript = (locale: string): Promise<void> => {
  const existing = document.querySelector<HTMLScriptElement>('script[data-gsi]');

  if (existing?.dataset.gsi === locale) {
    return window.google?.accounts?.id
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('gsi')), { once: true });
        });
  }

  existing?.remove();
  delete window.google;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${GSI_SRC}?hl=${encodeURIComponent(locale)}`;
    script.async = true;
    script.dataset.gsi = locale;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('gsi')), { once: true });
    document.head.append(script);
  });
};

export const GoogleSignIn = () => {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const { signInWithGoogle } = useAuth();
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    (response: CredentialResponse) => {
      if (!response.credential) {
        setError(t('googleFailed'));
        return;
      }

      setError(null);

      void signInWithGoogle(response.credential, locale).catch((cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : t('googleFailed'));
      });
    },
    [locale, signInWithGoogle, t],
  );

  const latestCredentialHandler = useRef(handleCredential);
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    latestCredentialHandler.current = handleCredential;
  }, [handleCredential]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!CLIENT_ID || !frame) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.min(Math.round(entry.contentRect.width), MAX_BUTTON_WIDTH));
    });

    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!CLIENT_ID || width === 0 || !resolvedTheme) {
      return;
    }

    let active = true;

    const render = async () => {
      try {
        await loadGsiScript(locale);
      } catch {
        if (active) {
          setError(t('googleUnavailable'));
        }

        return;
      }

      const identity = window.google?.accounts.id;
      const parent = containerRef.current;

      if (!active || !identity || !parent) {
        return;
      }

      if (initializedFor.current !== locale) {
        identity.initialize({
          client_id: CLIENT_ID,
          callback: (response) => latestCredentialHandler.current(response),
        });
        initializedFor.current = locale;
      }

      parent.replaceChildren();
      identity.renderButton(parent, {
        type: 'standard',
        theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'center',
        width,
      });

      setReady(true);
    };

    void render();

    return () => {
      active = false;
    };
  }, [locale, resolvedTheme, t, width]);

  useEffect(() => () => window.google?.accounts.id.cancel(), []);

  if (!CLIENT_ID) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="bg-border h-px flex-1" />
        <span className="text-foreground-subtle text-xs">{t('or')}</span>
        <span className="bg-border h-px flex-1" />
      </div>

      {}
      <div
        ref={frameRef}
        className="border-border-strong bg-surface relative min-h-10 overflow-hidden rounded-md border"
      >
        <div ref={containerRef} className={ready ? undefined : 'invisible'} />
        {ready ? null : <Skeleton className="absolute inset-0 rounded-none" />}
      </div>

      {error ? (
        <p
          role="alert"
          className="bg-danger-soft text-danger animate-row rounded-md px-3 py-2 text-[0.8125rem]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};
