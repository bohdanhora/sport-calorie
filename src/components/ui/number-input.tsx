import type { InputHTMLAttributes } from 'react';

import { Input } from '@/components/ui/input';

/**
 * A field for a number that may have a fractional part. Deliberately not
 * `type="number"`: that one accepts a full stop and nothing else, so the comma
 * on a localised phone keyboard produced a value the browser threw away. The
 * keypad still comes up through inputMode; `toDecimal` reads what it returns.
 */
export const NumberInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <Input type="text" inputMode="decimal" autoComplete="off" {...props} />
);
