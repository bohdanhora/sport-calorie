import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * One stack below xl, two side by side above it, so a wide display shows a
 * screen at a glance instead of a narrow ribbon with empty margins. Reading
 * order is the source order, which is what a screen reader and the keyboard
 * follow either way.
 */
export const Columns = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'space-y-7 xl:grid xl:grid-cols-2 xl:items-start xl:gap-6 xl:space-y-0',
      className,
    )}
  >
    {children}
  </div>
);

export const Column = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('space-y-7', className)}>{children}</div>
);
