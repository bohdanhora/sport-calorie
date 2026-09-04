import { cn } from '@/lib/utils/cn';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('bg-surface-muted animate-pulse rounded-md', className)} />
);
