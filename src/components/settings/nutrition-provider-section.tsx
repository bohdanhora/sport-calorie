'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { nutritionProviderApi } from '@/lib/api/endpoints';
import type { CatalogProvider } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/query-keys';

const CUSTOM_PROVIDER = 'custom';
const MANUAL_OPTION = '__manual__';

interface ProviderValues {
  baseUrl: string;
  modelName: string;
  visionModelName: string;
  visionOverride: boolean;
  apiKey: string;
}

/**
 * The ids come from the provider itself, so they are never out of date. What no
 * OpenAI compatible provider reports is modality, which is why whether a model
 * takes photos is decided by a catalog on our side, and why the user can say
 * otherwise.
 */
const ModelPicker = ({
  value,
  onChange,
  models,
  emptyOption,
  id,
  ...aria
}: {
  value: string;
  onChange: (value: string) => void;
  models: string[];
  emptyOption?: string;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) => {
  const t = useTranslations('provider');
  const [manual, setManual] = useState(false);

  // Before the first save there is no key to ask with, so the list is empty and
  // the id has to be typed. The same holds if the provider refuses to list.
  if (models.length === 0 || manual) {
    return (
      <Input
        {...aria}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        placeholder={t('modelPlaceholder')}
        className="font-sans"
      />
    );
  }

  const options = models.includes(value) || value === '' ? models : [value, ...models];

  return (
    <NativeSelect
      {...aria}
      id={id}
      value={value}
      onChange={(event) => {
        if (event.target.value === MANUAL_OPTION) {
          setManual(true);
          return;
        }

        onChange(event.target.value);
      }}
    >
      {emptyOption === undefined ? null : <option value="">{emptyOption}</option>}
      {options.map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
      <option value={MANUAL_OPTION}>{t('typeItIn')}</option>
    </NativeSelect>
  );
};

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
    staleTime: 5 * 60_000,
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.providerModels });
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
                <NativeSelect
                  {...props}
                  value={selectedProviderId}
                  onChange={(event) => {
                    const next = providers.find((entry) => entry.id === event.target.value);
                    setValue('baseUrl', next ? next.baseUrl : '', { shouldValidate: true });
                  }}
                >
                  {providers.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                  <option value={CUSTOM_PROVIDER}>{t('customProvider')}</option>
                </NativeSelect>
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
                  placeholder="sk-..."
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
              hint={models.isError ? t('modelsUnavailable') : t('modelHint')}
            >
              {(props) => (
                <Controller
                  control={control}
                  name="modelName"
                  render={({ field }) => (
                    <ModelPicker
                      {...props}
                      value={field.value}
                      onChange={field.onChange}
                      models={models.data?.models ?? []}
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
                    <ModelPicker
                      {...props}
                      value={field.value}
                      onChange={field.onChange}
                      models={models.data?.models ?? []}
                      emptyOption={t('visionOff')}
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
