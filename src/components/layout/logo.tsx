import { cn } from '@/lib/utils/cn';

/**
 * The mark is the calorie ring the day screen is built around: an arc closing
 * on itself, left open where the day still has room. Drawn in currentColor so
 * it takes the tone of whatever it sits in.
 */
export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('size-[1.375rem]', className)}>
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="3.25"
      strokeLinecap="round"
      strokeDasharray="43 57"
      transform="rotate(-90 12 12)"
    />
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
    <LogoMark className="text-accent shrink-0" />
    <div className="min-w-0">
      <p className="text-[0.9375rem] leading-tight font-semibold tracking-tight">{name}</p>
      {tagline ? <p className="text-foreground-subtle mt-0.5 text-xs">{tagline}</p> : null}
    </div>
  </div>
);
