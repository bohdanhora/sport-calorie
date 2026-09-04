'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { nutritionProviderApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/query-keys';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

interface ProviderValues {
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

export const NutritionProviderSection = () => {
  const t = useTranslations('provider');
  const common = useTranslations('common');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const provider = useQuery({
    queryKey: queryKeys.nutritionProvider,
    queryFn: nutritionProviderApi.get,
  });

  const schema = useMemo(
    () =>
      z.object({
        baseUrl: z.url(t('urlInvalid')),
        modelName: z.string().trim().min(1, t('modelRequired')),
        apiKey: z.string().trim(),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProviderValues>({
    resolver: zodResolver(schema),
    defaultValues: { baseUrl: DEFAULT_BASE_URL, modelName: DEFAULT_MODEL, apiKey: '' },
  });

  useEffect(() => {
    if (provider.data) {
      reset({
        baseUrl: provider.data.baseUrl ?? DEFAULT_BASE_URL,
        modelName: provider.data.modelName ?? DEFAULT_MODEL,
        apiKey: '',
      });
    }
  }, [provider.data, reset]);

  const save = useMutation({
    mutationFn: (values: ProviderValues) => nutritionProviderApi.save(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.nutritionProvider });
      showToast({ title: t('saved') });
    },
    onError: (error: unknown) => {
      showToast({
        title: t('saveFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const remove = useMutation({
    mutationFn: nutritionProviderApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.nutritionProvider });
      showToast({ title: t('removed') });
    },
  });

  const check = useMutation({
    mutationFn: nutritionProviderApi.check,
    onSuccess: (result) => {
      showToast({
        title: result.ok ? t('checkOk') : t('checkFailed'),
        description: result.message ?? undefined,
        tone: result.ok ? 'default' : 'danger',
      });
    },
    onError: () => showToast({ title: t('checkFailed'), tone: 'danger' }),
  });

  const isConfigured = provider.data?.isConfigured ?? false;

  const onSubmit = handleSubmit((values) => {
    if (!values.apiKey.trim()) {
      showToast({ title: t('keyRequired'), tone: 'danger' });
      return;
    }

    save.mutate(values);
  });

  return (
    <Section
      title={t('title')}
      action={
        <span className={`text-xs ${isConfigured ? 'text-accent' : 'text-foreground-subtle'}`}>
          {isConfigured ? t('configured') : t('notConfigured')}
        </span>
      }
    >
      <div className="border-border bg-surface space-y-4 rounded-lg border px-4 py-4">
        <p className="text-foreground-muted text-[0.8125rem] leading-relaxed">{t('description')}</p>

        {provider.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label={t('baseUrl')} error={errors.baseUrl?.message} hint={t('baseUrlHint')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('baseUrl')}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  className="font-sans"
                />
              )}
            </Field>

            <Field label={t('model')} error={errors.modelName?.message} hint={t('modelHint')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('modelName')}
                  autoComplete="off"
                  className="font-sans"
                />
              )}
            </Field>

            <Field
              label={t('apiKey')}
              hint={
                isConfigured && provider.data?.apiKeyHint
                  ? `${t('apiKeyStored', { hint: provider.data.apiKeyHint })} ${t('replaceKey')}`
                  : t('apiKeyHint')
              }
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('apiKey')}
                  type="password"
                  autoComplete="off"
                  placeholder="sk-..."
                  className="font-sans"
                />
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? common('saving') : t('connect')}
              </Button>

              {isConfigured ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={check.isPending}
                    onClick={() => check.mutate()}
                  >
                    {check.isPending ? t('checking') : t('check')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate()}
                  >
                    {t('remove')}
                  </Button>
                </>
              ) : null}
            </div>
          </form>
        )}

        <p className="text-foreground-subtle text-xs">{t('privacyNote')}</p>
      </div>
    </Section>
  );
};
