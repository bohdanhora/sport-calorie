'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

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

/**
 * The button text follows the `hl` of the library itself; the `locale` option on
 * renderButton is ignored, which leaves Google guessing the language. Switching
 * language therefore means loading the library again under the new one.
 */
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

/**
 * Renders Google's own button, which is what their branding rules ask for, and
 * hands the ID token it returns to the API. Without a client id there is nothing
 * to render, so the whole block disappears.
 */
export const GoogleSignIn = () => {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const { signInWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!CLIENT_ID) {
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

      parent.replaceChildren();
      identity.initialize({ client_id: CLIENT_ID, callback: handleCredential });
      identity.renderButton(parent, {
        type: 'standard',
        theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: parent.clientWidth || undefined,
      });

      setReady(true);
    };

    void render();

    return () => {
      active = false;
      window.google?.accounts.id.cancel();
    };
  }, [handleCredential, locale, resolvedTheme, t]);

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

      <div className="min-h-11">
        <div ref={containerRef} className="flex justify-center" />
        {ready ? null : <Skeleton className="h-11 w-full" />}
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
