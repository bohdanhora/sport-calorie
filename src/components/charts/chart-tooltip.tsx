'use client';

import type { TooltipContentProps } from 'recharts';

interface ChartTooltipProps extends Partial<TooltipContentProps<number, string>> {
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
}

export const ChartTooltip = ({
  active,
  payload,
  label,
  formatValue,
  formatDate,
}: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="border-border bg-surface-raised rounded-md border px-3 py-2 shadow-md">
      <p className="text-foreground-subtle text-xs">
        {typeof label === 'string' ? formatDate(label) : ''}
      </p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((item) => (
          <li key={item.dataKey as string} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-foreground-muted">{item.name}</span>
            <span className="numeric text-foreground ml-auto font-medium">
              {formatValue(Number(item.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
