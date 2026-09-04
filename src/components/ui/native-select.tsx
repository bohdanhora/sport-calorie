import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export const NativeSelect = ({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'border-border-strong bg-surface text-foreground focus-visible:border-accent focus-visible:outline-ring h-10 w-full appearance-none rounded-md border px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1',
      className,
    )}
    {...props}
  >
    {children}
  </select>
);
