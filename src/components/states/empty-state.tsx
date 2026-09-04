import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="border-border rounded-lg border border-dashed px-5 py-8 text-center">
    <p className="text-foreground text-sm font-medium">{title}</p>
    <p className="text-foreground-muted mx-auto mt-1 max-w-xs text-[0.8125rem] leading-relaxed">
      {description}
    </p>
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);
