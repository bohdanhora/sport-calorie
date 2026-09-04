'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type ToastTone = 'default' | 'danger';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;
const MAX_VISIBLE_TOASTS = 3;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback<ToastContextValue['showToast']>(
    ({ title, description, tone = 'default' }) => {
      setMessages((current) =>
        [...current, { id: Date.now() + current.length, title, description, tone }].slice(
          -MAX_VISIBLE_TOASTS,
        ),
      );
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider duration={TOAST_DURATION_MS} swipeDirection="up">
        {children}

        {messages.map((message) => (
          <ToastPrimitive.Root
            key={message.id}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(message.id);
              }
            }}
            className={cn(
              'bg-surface-raised flex animate-[fade-in_180ms_ease-out] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
              message.tone === 'danger' ? 'border-danger/40' : 'border-border',
            )}
          >
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title
                className={cn(
                  'text-[0.8125rem] font-medium',
                  message.tone === 'danger' ? 'text-danger' : 'text-foreground',
                )}
              >
                {message.title}
              </ToastPrimitive.Title>
              {message.description ? (
                <ToastPrimitive.Description className="text-foreground-muted mt-0.5 text-xs">
                  {message.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[60] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 outline-none sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:translate-x-0" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
};
