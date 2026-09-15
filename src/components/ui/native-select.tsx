import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export const NativeSelect = ({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'border-border-strong bg-surface text-foreground focus-visible:border-accent focus-visible:ring-accent/20 h-11 w-full appearance-none rounded-md border px-3 text-sm transition-[color,border-color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:outline-none sm:h-10',
      className,
    )}
    {...props}
  >
    {children}
  </select>
);
