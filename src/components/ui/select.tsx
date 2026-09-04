'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  id?: string;
  placeholder?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
}

export const Select = <T extends string>({
  value,
  onValueChange,
  options,
  id,
  placeholder,
  className,
  ...aria
}: SelectProps<T>) => (
  <SelectPrimitive.Root value={value} onValueChange={(next) => onValueChange(next as T)}>
    <SelectPrimitive.Trigger
      id={id}
      {...aria}
      className={cn(
        'border-border-strong bg-surface text-foreground focus-visible:border-accent focus-visible:outline-ring data-[placeholder]:text-foreground-subtle aria-[invalid=true]:border-danger flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1',
        className,
      )}
    >
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon>
        <ChevronDown className="text-foreground-subtle size-4" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>

    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={4}
        className="border-border bg-surface-raised z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border shadow-lg"
      >
        <SelectPrimitive.Viewport className="p-1">
          {options.map((option) => (
            <SelectPrimitive.Item
              key={option.value}
              value={option.value}
              className="text-foreground data-[highlighted]:bg-surface-muted flex cursor-default items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-sm outline-none"
            >
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator>
                <Check className="text-accent size-4" aria-hidden />
              </SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);
