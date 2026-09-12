import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground hover:bg-accent-hover',
        secondary: 'border border-border-strong bg-surface text-foreground hover:bg-surface-muted',
        ghost: 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
        danger: 'text-danger hover:bg-danger-soft',
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem] sm:h-8',
        md: 'h-11 px-4 text-sm sm:h-10',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-10 sm:size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = ({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps) => {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type })}
      {...props}
    />
  );
};
