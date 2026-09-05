'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type InputHTMLAttributes } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

/**
 * A password field that can show what was typed. A mistyped password is the
 * usual reason a sign-in fails, and on a phone it is the hardest to notice.
 */
export const PasswordInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  const t = useTranslations('auth');
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10 font-sans', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        className="text-foreground-subtle hover:text-foreground focus-visible:outline-ring absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
};
