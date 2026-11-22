import { cn } from '@/lib/utils/cn';

export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5.5', className)}>
    <rect width="24" height="24" rx="6" className="fill-accent" />
    <circle cx="15.75" cy="15.75" r="3.4" className="fill-accent-foreground" />
  </svg>
);

export const Logo = ({
  name,
  tagline,
  className,
}: {
  name: string;
  tagline?: string;
  className?: string;
}) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <LogoMark className="shrink-0" />
    <div className="min-w-0">
      <p className="font-display text-base leading-tight font-semibold tracking-tight">{name}</p>
      {tagline ? (
        <p className="text-foreground-subtle text-2xs mt-0.5 font-mono uppercase">{tagline}</p>
      ) : null}
    </div>
  </div>
);
