import { cn } from '@/lib/utils/cn';

export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5.5', className)}>
    <rect width="24" height="24" className="fill-foreground" />
    <rect x="13" y="13" width="6" height="6" className="fill-accent" />
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
      <p className="font-display text-sm leading-tight font-semibold tracking-tight uppercase">
        {name}
      </p>
      {tagline ? (
        <p className="text-foreground-subtle text-2xs mt-0.5 font-mono uppercase">{tagline}</p>
      ) : null}
    </div>
  </div>
);
