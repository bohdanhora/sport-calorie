'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { nutritionProviderApi } from '@/lib/api/endpoints';
import type { CatalogProvider } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/query-keys';
import { cn } from '@/lib/utils/cn';

const CUSTOM_PROVIDER = 'custom';

interface ProviderValues {
  baseUrl: string;
  modelName: string;
  visionModelName: string;
  visionOverride: boolean;
  apiKey: string;
}

const sameBaseUrl = (first: string, second: string) =>
  first.trim().replace(/\/+$/, '').toLowerCase() ===
  second.trim().replace(/\/+$/, '').toLowerCase();

export const NutritionProviderSection = () => {
  const t = useTranslations('provider');
  const common = useTranslations('common');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const provider = useQuery({
    queryKey: queryKeys.nutritionProvider,
    queryFn: nutritionProviderApi.get,
  });

  const catalog = useQuery({
    queryKey: queryKeys.providerCatalog,
    queryFn: nutritionProviderApi.catalog,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const isConfigured = provider.data?.isConfigured ?? false;

  const models = useQuery({
    queryKey: queryKeys.providerModels,
    queryFn: nutritionProviderApi.models,
    enabled: isConfigured,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const schema = useMemo(
    () =>
      z.object({
        baseUrl: z.url(t('urlInvalid')),
        modelName: z.string().trim().min(1, t('modelRequired')),
        visionModelName: z.string().trim(),
        visionOverride: z.boolean(),
        apiKey: z.string().trim(),
      }),
    [t],
  );

  const providers: CatalogProvider[] = catalog.data ?? [];
  const defaultBaseUrl = providers[0]?.baseUrl ?? 'https://api.openai.com/v1';

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProviderValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseUrl: defaultBaseUrl,
      modelName: '',
      visionModelName: '',
      visionOverride: false,
      apiKey: '',
    },
  });

  useEffect(() => {
    if (provider.data && catalog.data) {
      reset({
        baseUrl: provider.data.baseUrl ?? defaultBaseUrl,
        modelName: provider.data.modelName ?? '',
        visionModelName: provider.data.visionModelName ?? '',
        visionOverride: provider.data.visionOverride,
        apiKey: '',
      });
    }
  }, [provider.data, catalog.data, defaultBaseUrl, reset]);

  const baseUrl = watch('baseUrl');
  const visionModelName = watch('visionModelName');
  const visionOverride = watch('visionOverride');

  const known = providers.find((entry) => entry.baseUrl === baseUrl);
  const selectedProviderId = known?.id ?? CUSTOM_PROVIDER;

  const connectedHere =
    isConfigured && provider.data?.baseUrl != null && sameBaseUrl(provider.data.baseUrl, baseUrl);

  const refresh = useMutation({
    mutationFn: nutritionProviderApi.refreshModels,
    onSuccess: (result) => queryClient.setQueryData(queryKeys.providerModels, result),
    onError: (error: unknown) => {
      showToast({
        title: t('modelsRefreshFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const offeredModels = connectedHere ? (models.data?.models ?? []) : [];
  const modelsLoading = connectedHere && (models.isFetching || refresh.isPending);

  const modelsHint = !connectedHere
    ? t('modelsAfterConnect')
    : models.isError && !models.data
      ? t('modelsUnavailable')
      : modelsLoading && !models.data
        ? t('modelsLoading')
        : t('modelsCount', { count: offeredModels.length });

  const visionRecognised =
    visionModelName !== '' &&
    (known?.visionPrefixes ?? []).some((prefix) =>
      visionModelName.toLowerCase().startsWith(prefix),
    );

  const save = useMutation({
    mutationFn: (values: ProviderValues) =>
      nutritionProviderApi.save({
        baseUrl: values.baseUrl,
        modelName: values.modelName,
        visionModelName: values.visionModelName || null,
        visionOverride: values.visionOverride,
        ...(values.apiKey.trim() ? { apiKey: values.apiKey.trim() } : {}),
      }),
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
      queryClient.removeQueries({ queryKey: queryKeys.providerModels });
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

  const onSubmit = handleSubmit((values) => {
    if (!isConfigured && !values.apiKey.trim()) {
      showToast({ title: t('keyRequired'), tone: 'danger' });
      return;
    }

    save.mutate(values);
  });

  return (
    <Section
      title={t('title')}
      action={
        <span className={isConfigured ? 'text-accent text-xs' : 'text-foreground-subtle text-xs'}>
          {isConfigured ? t('configured') : t('notConfigured')}
        </span>
      }
    >
      <div className="border-border bg-surface space-y-4 rounded-lg border px-4 py-4">
        <p className="text-foreground-muted text-[0.8125rem] leading-relaxed">{t('description')}</p>

        {provider.isPending || catalog.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label={t('provider')} hint={known?.baseUrl}>
              {(props) => (
                <Select
                  {...props}
                  value={selectedProviderId}
                  onValueChange={(id) => {
                    const next = providers.find((entry) => entry.id === id);

                    setValue('baseUrl', next ? next.baseUrl : '', { shouldValidate: true });
                    setValue('modelName', next?.defaultModel ?? '', { shouldValidate: true });
                    setValue('visionModelName', '');
                    setValue('visionOverride', false);
                  }}
                  options={[
                    ...providers.map((entry) => ({ value: entry.id, label: entry.label })),
                    { value: CUSTOM_PROVIDER, label: t('customProvider') },
                  ]}
                />
              )}
            </Field>

            {known ? null : (
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
            )}

            <Field
              label={t('apiKey')}
              hint={
                isConfigured && provider.data?.apiKeyHint
                  ? `${t('apiKeyStored', { hint: provider.data.apiKeyHint })} ${t('keyOptional')}`
                  : t('apiKeyHint')
              }
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('apiKey')}
                  type="password"
                  autoComplete="off"
                  placeholder={known?.keyHint ?? 'sk-...'}
                  className="font-sans"
                />
              )}
            </Field>

            {known ? (
              <a
                href={known.apiKeysUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent inline-flex items-center gap-1.5 text-[0.8125rem] font-medium underline-offset-4 hover:underline"
              >
                {t('whereToGetKey', { provider: known.label })}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}

            <Field
              label={t('model')}
              error={errors.modelName?.message}
              hint={modelsHint}
              action={
                connectedHere ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-my-1 -mr-2"
                    disabled={modelsLoading}
                    onClick={() => refresh.mutate()}
                  >
                    <RefreshCw
                      className={cn('size-3.5', modelsLoading && 'animate-spin')}
                      aria-hidden
                    />
                    {t('refreshModels')}
                  </Button>
                ) : null
              }
            >
              {(props) => (
                <Controller
                  control={control}
                  name="modelName"
                  render={({ field }) => (
                    <Combobox
                      {...props}
                      value={field.value}
                      onChange={field.onChange}
                      options={offeredModels}
                      loading={modelsLoading}
                      allowCustom
                      placeholder={t('modelPlaceholder')}
                      searchPlaceholder={
                        offeredModels.length > 0 ? t('modelSearch') : t('modelPlaceholder')
                      }
                      aria-label={t('model')}
                    />
                  )}
                />
              )}
            </Field>

            <Field label={t('visionModel')} hint={t('visionModelHint')}>
              {(props) => (
                <Controller
                  control={control}
                  name="visionModelName"
                  render={({ field }) => (
                    <Combobox
                      {...props}
                      value={field.value}
                      onChange={field.onChange}
                      options={offeredModels}
                      loading={modelsLoading}
                      allowCustom
                      emptyLabel={t('visionOff')}
                      searchPlaceholder={
                        offeredModels.length > 0 ? t('modelSearch') : t('modelPlaceholder')
                      }
                      aria-label={t('visionModel')}
                    />
                  )}
                />
              )}
            </Field>

            {visionModelName !== '' && !visionRecognised ? (
              <div className="border-border bg-surface-muted space-y-2 rounded-md border px-3 py-2.5">
                <p className="text-foreground-muted text-xs leading-relaxed">
                  {t('visionUnknown', { model: visionModelName })}
                </p>
                <label className="flex items-center gap-2 text-[0.8125rem]">
                  <input
                    type="checkbox"
                    {...register('visionOverride')}
                    className="accent-accent size-4"
                  />
                  {t('visionOverrideLabel')}
                </label>
              </div>
            ) : null}

            {visionModelName !== '' && (visionRecognised || visionOverride) ? (
              <p className="text-accent text-xs">{t('visionReady')}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? common('saving') : isConfigured ? common('save') : t('connect')}
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
