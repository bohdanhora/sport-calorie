'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** A dialog the user has to answer, such as onboarding, sets this to false. */
  dismissible?: boolean;
}

export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  dismissible = true,
}: DialogProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-[overlay-in_180ms_ease-out] bg-black/35" />
      <DialogPrimitive.Content
        onEscapeKeyDown={(event) => {
          if (!dismissible) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (!dismissible) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (!dismissible) {
            event.preventDefault();
          }
        }}
        className={cn(
          'border-border bg-surface-raised fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] animate-[sheet-in_200ms_ease-out] flex-col rounded-t-xl border',
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-[dialog-in_180ms_ease-out] sm:rounded-lg',
          className,
        )}
      >
        <header className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="space-y-1">
            <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-foreground-muted text-[0.8125rem]">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {dismissible ? (
            <DialogPrimitive.Close
              aria-label="Close"
              className="text-foreground-subtle hover:bg-surface-muted hover:text-foreground -mt-1 -mr-1 rounded-md p-1.5 transition-colors duration-150"
            >
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
