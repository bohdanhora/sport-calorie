'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';

import { cn } from '@/lib/utils/cn';

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  group?: string;
}

interface ComboboxItem {
  key: string;
  value: string;
  label: string;
  hint?: string;
  group?: string;
  kind: 'empty' | 'custom' | 'option';
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | ComboboxOption)[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  allowCustom?: boolean;
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
}

const toOption = (option: string | ComboboxOption): ComboboxOption =>
  typeof option === 'string' ? { value: option, label: option } : option;

const matches = (option: ComboboxOption, tokens: string[]) => {
  const text = `${option.label} ${option.hint ?? ''}`.toLowerCase();

  return tokens.every((token) => text.includes(token));
};

export const Combobox = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  allowCustom = false,
  loading = false,
  disabled = false,
  id,
  className,
  ...aria
}: ComboboxProps) => {
  const common = useTranslations('common');
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const query = search.trim();
  const normalized = useMemo(() => options.map(toOption), [options]);

  const items = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list: ComboboxItem[] = [];

    if (emptyLabel !== undefined && tokens.length === 0) {
      list.push({ key: 'empty', value: '', label: emptyLabel, kind: 'empty' });
    }

    if (allowCustom && query !== '' && !normalized.some((option) => option.value === query)) {
      list.push({
        key: 'custom',
        value: query,
        label: common('useValue', { value: query }),
        kind: 'custom',
      });
    }

    for (const option of normalized) {
      if (matches(option, tokens)) {
        list.push({ ...option, key: `option:${option.value}`, kind: 'option' });
      }
    }

    return list;
  }, [allowCustom, common, emptyLabel, normalized, query]);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey),
  );
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    if (open) {
      document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    }
  });

  const isSelected = (item: ComboboxItem) =>
    item.kind === 'empty' ? value === '' : item.kind === 'option' && item.value === value;

  const choose = (item: ComboboxItem) => {
    onChange(item.value);
    setOpen(false);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (items.length === 0) {
        return;
      }

      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (activeIndex + step + items.length) % items.length;

      setActiveKey(items[next].key);
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (items[activeIndex]) {
        choose(items[activeIndex]);
      }
    }
  };

  const shown =
    value !== ''
      ? (normalized.find((option) => option.value === value)?.label ?? value)
      : (emptyLabel ?? placeholder ?? '');

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (next) {
          setSearch('');
          setActiveKey(
            value === '' ? (emptyLabel === undefined ? null : 'empty') : `option:${value}`,
          );
        }
      }}
    >
      <PopoverPrimitive.Trigger
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        {...aria}
        className={cn(
          'border-border-strong bg-surface text-foreground hover:border-foreground-subtle/60 focus-visible:border-accent focus-visible:ring-accent/20 aria-[invalid=true]:border-danger flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-3 text-left text-sm transition-[color,border-color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:outline-none disabled:opacity-60 sm:h-10',
          open && 'border-accent ring-accent/20 ring-3',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', value === '' && 'text-foreground-subtle')}>
          {shown}
        </span>
        {loading ? (
          <LoaderCircle
            className="text-foreground-subtle size-4 shrink-0 animate-spin"
            aria-hidden
          />
        ) : (
          <ChevronDown
            className={cn(
              'text-foreground-subtle size-4 shrink-0 transition-transform duration-150',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="border-border bg-surface-raised z-[60] flex max-h-[min(22rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1.5rem)] animate-[fade-in_140ms_ease-out] flex-col overflow-hidden rounded-lg border shadow-lg"
        >
          <div className="border-border relative border-b">
            <Search
              className="text-foreground-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items.length > 0 ? optionId(activeIndex) : undefined}
              aria-label={searchPlaceholder ?? common('search')}
              placeholder={searchPlaceholder ?? common('search')}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={200}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveKey(null);
              }}
              onKeyDown={onSearchKeyDown}
              className="text-foreground placeholder:text-foreground-subtle h-11 w-full bg-transparent pr-3 pl-9 text-sm outline-none sm:h-10"
            />
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label={aria['aria-label']}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
          >
            {items.map((item, index) => (
              <div key={item.key} role="presentation">
                {item.group && item.group !== items[index - 1]?.group ? (
                  <p
                    role="presentation"
                    className={cn('label-caps px-2.5 pt-2 pb-1', index > 0 && 'mt-1')}
                  >
                    {item.group}
                  </p>
                ) : null}
                <div
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected(item)}
                  onPointerMove={() => setActiveKey(item.key)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(item)}
                  className={cn(
                    'flex cursor-default items-center gap-2 rounded-sm px-2.5 py-2.5 text-sm select-none sm:py-2',
                    index === activeIndex && 'bg-surface-muted',
                    item.kind === 'option' && 'text-foreground',
                    item.kind === 'empty' && 'text-foreground-muted',
                    item.kind === 'custom' && 'text-accent font-medium',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint ? (
                    <span className="numeric text-foreground-subtle shrink-0 text-xs">
                      {item.hint}
                    </span>
                  ) : null}
                  {isSelected(item) ? (
                    <Check className="text-accent size-4 shrink-0" aria-hidden />
                  ) : (
                    <span aria-hidden className="size-4 shrink-0" />
                  )}
                </div>
              </div>
            ))}

            {items.length === 0 ? (
              <p className="text-foreground-subtle px-3 py-6 text-center text-[0.8125rem]">
                {common('noMatches')}
              </p>
            ) : null}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
