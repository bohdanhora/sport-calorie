'use client';

import { Dumbbell, Footprints, Scale, UtensilsCrossed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils/cn';

export type QuickAction = 'food' | 'walk' | 'workout' | 'weight';

const ACTIONS: { id: QuickAction; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'food', icon: UtensilsCrossed },
  { id: 'walk', icon: Footprints },
  { id: 'workout', icon: Dumbbell },
  { id: 'weight', icon: Scale },
];

export const QuickAdd = ({
  onSelect,
  className,
}: {
  onSelect: (action: QuickAction) => void;
  className?: string;
}) => {
  const t = useTranslations('quickAdd');

  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {ACTIONS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className="press border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium"
        >
          <Icon className="size-[1.125rem]" aria-hidden />
          {t(id)}
        </button>
      ))}
    </div>
  );
};
