'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { GoogleSignIn } from '@/components/auth/google-sign-in';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-provider';

interface LoginValues {
  email: string;
  password: string;
}

const LoginPage = () => {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('invalidEmail')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await login(values);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t('signInFailed'));
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="page-title">{t('signInTitle')}</h1>
        <p className="text-foreground-muted text-sm">{t('signInSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t('email')} error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              className="font-sans"
            />
          )}
        </Field>

        <Field label={t('password')} error={errors.password?.message}>
          {(props) => (
            <PasswordInput {...props} {...register('password')} autoComplete="current-password" />
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
          {isSubmitting ? t('signingIn') : t('signIn')}
        </Button>
      </form>

      <GoogleSignIn />

      <p className="text-foreground-muted border-border border-t pt-5 text-center text-[0.8125rem]">
        {t('noAccount')}{' '}
        <Link
          href="/register"
          className="text-accent font-medium underline-offset-4 hover:underline"
        >
          {t('createOne')}
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
