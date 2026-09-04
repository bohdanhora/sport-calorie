'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-provider';

const MIN_PASSWORD_LENGTH = 8;

interface RegisterValues {
  displayName: string;
  email: string;
  password: string;
}

const RegisterPage = () => {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        displayName: z.string().trim().max(80),
        email: z.email(t('invalidEmail')),
        password: z
          .string()
          .min(MIN_PASSWORD_LENGTH, t('passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
          .max(128),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await createAccount({
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
        locale,
      });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('registerFailed'));
    }
  });

  return (
    <div className="animate-rise space-y-6">
      <div className="space-y-1">
        <h1 className="page-title">{t('registerTitle')}</h1>
        <p className="text-foreground-muted text-sm">{t('registerSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t('name')} error={errors.displayName?.message} optional>
          {(props) => (
            <Input
              {...props}
              {...register('displayName')}
              autoComplete="given-name"
              className="font-sans"
            />
          )}
        </Field>

        <Field label={t('email')} error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="font-sans"
            />
          )}
        </Field>

        <Field
          label={t('password')}
          error={errors.password?.message}
          hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })}
        >
          {(props) => (
            <Input
              {...props}
              {...register('password')}
              type="password"
              autoComplete="new-password"
              className="font-sans"
            />
          )}
        </Field>

        {formError ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger animate-row rounded-md px-3 py-2 text-[0.8125rem]"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('creatingAccount') : t('createAccount')}
        </Button>
      </form>

      <p className="text-foreground-muted text-center text-[0.8125rem]">
        {t('haveAccount')}{' '}
        <Link href="/login" className="text-accent font-medium underline-offset-4 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
