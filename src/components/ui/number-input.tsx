import type { InputHTMLAttributes } from 'react';

import { Input } from '@/components/ui/input';

export const NumberInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <Input type="text" inputMode="decimal" autoComplete="off" {...props} />
);
