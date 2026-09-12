import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

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
