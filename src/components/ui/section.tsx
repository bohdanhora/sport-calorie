import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface SectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3';
}

export const Section = ({
  title,
  action,
  children,
  className,
  headingLevel = 'h2',
}: SectionProps) => {
  const Heading = headingLevel;

  return (
    <section className={cn('space-y-3', className)}>
      {title || action ? (
        <div className="flex min-h-8 items-center justify-between gap-3">
          {title ? <Heading className="section-title">{title}</Heading> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
};

export const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('border-border bg-surface rounded-lg border', className)}>{children}</div>
);

export const DividedList = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <ul className={cn('divide-border divide-y', className)}>{children}</ul>;
