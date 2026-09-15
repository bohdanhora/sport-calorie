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
        'group border-border-strong bg-surface text-foreground hover:border-foreground-subtle/60 focus-visible:border-accent focus-visible:ring-accent/20 data-[placeholder]:text-foreground-subtle aria-[invalid=true]:border-danger data-[state=open]:border-accent data-[state=open]:ring-accent/20 flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm transition-[color,border-color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:outline-none data-[state=open]:ring-3 sm:h-10',
        className,
      )}
    >
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon>
        <ChevronDown
          className="text-foreground-subtle size-4 transition-transform duration-150 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>

    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        collisionPadding={12}
        className="border-border bg-surface-raised z-[60] max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] animate-[fade-in_140ms_ease-out] overflow-hidden rounded-lg border shadow-lg"
      >
        <SelectPrimitive.Viewport className="p-1">
          {options.map((option) => (
            <SelectPrimitive.Item
              key={option.value}
              value={option.value}
              className="text-foreground data-[highlighted]:bg-surface-muted flex cursor-default items-center justify-between gap-2 rounded-sm px-2.5 py-2.5 text-sm outline-none sm:py-2"
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
