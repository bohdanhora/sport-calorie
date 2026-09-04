import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

const fieldStyles =
  'w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground transition-colors duration-150 placeholder:text-foreground-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-60 aria-[invalid=true]:border-danger';

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(fieldStyles, 'numeric h-10', className)} {...props} />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(fieldStyles, 'min-h-20 py-2 leading-relaxed', className)} {...props} />
);
