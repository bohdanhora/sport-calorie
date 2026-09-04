'use client';

import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title = 'Could not load this',
  description = 'Check your connection and try again.',
  onRetry,
}: ErrorStateProps) => (
  <div role="alert" className="border-border bg-surface rounded-lg border px-5 py-6 text-center">
    <p className="text-foreground text-sm font-medium">{title}</p>
    <p className="text-foreground-muted mt-1 text-[0.8125rem]">{description}</p>
    {onRetry ? (
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        <RotateCw className="size-3.5" aria-hidden />
        Try again
      </Button>
    ) : null}
  </div>
);
