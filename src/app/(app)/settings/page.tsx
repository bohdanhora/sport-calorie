'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { OnboardingDialog } from '@/components/onboarding/onboarding-dialog';
import { NutritionProviderSection } from '@/components/settings/nutrition-provider-section';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Section } from '@/components/ui/section';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { WeightDialog } from '@/components/weight/weight-dialog';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';
import { persistLocale } from '@/i18n/persist-locale';
import { ApiError } from '@/lib/api/client';
import { profileApi, targetsApi, type UpdateProfileInput } from '@/lib/api/endpoints';
import type { ActivityLevel, BiologicalSex, FitnessGoal, Profile } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { todayIn } from '@/lib/format/dates';
import { listTimeZones } from '@/lib/format/time-zones';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { optionalNumber, requiredNumber, toValue } from '@/lib/validation/numbers';

const MIN_CALORIE_TARGET = 800;
const MAX_CALORIE_TARGET = 8000;
const ACTIVITY_LEVELS: ActivityLevel[] = ['SEDENTARY', 'LIGHT', 'MODERATE', 'HIGH', 'VERY_HIGH'];
const GOALS: FitnessGoal[] = ['LOSE_WEIGHT', 'MAINTAIN_WEIGHT', 'GAIN_WEIGHT'];

const SettingsPage = () => {
  const t = useTranslations('settings');
  const common = useTranslations('common');
  const { user, logout, timezone } = useAuth();
  const format = useFormat();
  const units = useTranslations('units');
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: profileApi.get });
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">{t('title')}</h1>
        <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
      </header>

      {profile.isPending ? (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <CalorieGoalSection profile={profile.data} />

          <Section title={t('body')}>
            <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div>
                <p className="label-caps">{t('currentWeight')}</p>
                <p className="metric-md mt-1">
                  {profile.data.currentWeightKg !== null ? (
                    <>
                      {format.weight(profile.data.currentWeightKg)}
                      <span className="text-foreground-subtle ml-1 text-xs font-normal">
                        {units('kilogram')}
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground-muted text-sm font-normal">
                      {t('notRecorded')}
                    </span>
                  )}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setWeightDialogOpen(true)}>
                {t('recordWeight')}
              </Button>
            </div>
          </Section>

          <ProfileSection profile={profile.data} />

          <NutritionProviderSection />

          <Section title={t('help')}>
            <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm">{t('showGuide')}</p>
                <p className="text-foreground-subtle mt-0.5 text-xs">{t('showGuideHint')}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setGuideOpen(true)}>
                {common('open')}
              </Button>
            </div>
          </Section>

          <Section title={t('appearance')}>
            <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <p className="text-sm">{t('theme')}</p>
              <ThemeToggle />
            </div>
          </Section>

          <Section title={t('account')}>
            <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">{user?.email}</p>
                <p className="text-foreground-subtle mt-0.5 text-xs">{t('signedIn')}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void logout()}>
                {t('signOut')}
              </Button>
            </div>
          </Section>
          <OnboardingDialog
            open={guideOpen}
            onOpenChange={setGuideOpen}
            profile={profile.data}
            guideOnly
          />

          <WeightDialog
            open={weightDialogOpen}
            onOpenChange={setWeightDialogOpen}
            date={todayIn(timezone)}
            currentWeightKg={profile.data.currentWeightKg}
          />
        </>
      )}
    </div>
  );
};

interface ProfileValues {
  displayName: string;
  birthDate: string;
  heightCm: number;
  targetWeightKg: number;
}

const ProfileSection = ({ profile }: { profile: Profile }) => {
  const t = useTranslations('settings');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const activityNames = useTranslations('activityLevels');
  const goalNames = useTranslations('goals');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [sex, setSex] = useState<BiologicalSex | ''>(profile.sex ?? '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [zone, setZone] = useState(profile.timezone);
  const [language, setLanguage] = useState<Locale>((profile.locale as Locale) ?? locale);

  const schema = useMemo(
    () =>
      z.object({
        displayName: z.string().trim().max(80),
        birthDate: z.string(),
        heightCm: optionalNumber(t('heightInvalid')),
        targetWeightKg: optionalNumber(t('targetWeightInvalid')),
      }),
    [t],
  );

  const toDefaults = (): ProfileValues => ({
    displayName: profile.displayName ?? '',
    birthDate: profile.birthDate ?? '',
    heightCm: profile.heightCm ?? Number.NaN,
    targetWeightKg: profile.targetWeightKg ?? Number.NaN,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(schema), defaultValues: toDefaults() });

  useEffect(() => {
    reset({
      displayName: profile.displayName ?? '',
      birthDate: profile.birthDate ?? '',
      heightCm: profile.heightCm ?? Number.NaN,
      targetWeightKg: profile.targetWeightKg ?? Number.NaN,
    });
    setSex(profile.sex ?? '');
    setActivityLevel(profile.activityLevel);
    setGoal(profile.goal);
    setZone(profile.timezone);
    setLanguage((profile.locale as Locale) ?? 'en');
  }, [profile, reset]);

  const save = useMutation({
    mutationFn: profileApi.update,
    onSuccess: async (updated: Profile) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast({ title: t('profileUpdated') });

      if (updated.locale !== locale) {
        persistLocale(updated.locale as Locale);
        router.refresh();
      }
    },
    onError: (error: unknown) => {
      showToast({
        title: t('profileFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const changed =
    isDirty ||
    sex !== (profile.sex ?? '') ||
    activityLevel !== profile.activityLevel ||
    goal !== profile.goal ||
    zone !== profile.timezone ||
    language !== profile.locale;

  const onSubmit = handleSubmit((values) => {
    const input: UpdateProfileInput = {
      displayName: values.displayName.trim() || null,
      birthDate: values.birthDate || null,
      heightCm: toValue(values.heightCm),
      targetWeightKg: toValue(values.targetWeightKg),
      activityLevel,
      goal,
      timezone: zone,
      locale: language,
    };

    if (sex) {
      input.sex = sex;
    }

    save.mutate(input);
  });

  const sexOptions = [
    { value: 'MALE' as const, label: t('male') },
    { value: 'FEMALE' as const, label: t('female') },
  ];

  return (
    <Section title={t('profile')}>
      <form
        onSubmit={onSubmit}
        noValidate
        className="border-border bg-surface space-y-4 rounded-lg border px-4 py-4"
      >
        <Field label={t('name')} optional>
          {(props) => <Input {...props} {...register('displayName')} className="font-sans" />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('sex')} hint={t('sexHint')}>
            {(props) => (
              <Select
                {...props}
                value={sex}
                onValueChange={setSex}
                options={sexOptions}
                placeholder={common('notSet')}
              />
            )}
          </Field>

          <Field label={t('birthDate')} error={errors.birthDate?.message}>
            {(props) => (
              <Input {...props} {...register('birthDate')} type="date" max={todayIn('UTC')} />
            )}
          </Field>

          <Field label={t('height')} error={errors.heightCm?.message} suffix={units('centimetre')}>
            {(props) => (
              <Input
                {...props}
                {...register('heightCm', { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="any"
                min="80"
                max="260"
                className="pr-12"
              />
            )}
          </Field>

          <Field
            label={t('targetWeight')}
            error={errors.targetWeightKg?.message}
            suffix={units('kilogram')}
          >
            {(props) => (
              <Input
                {...props}
                {...register('targetWeightKg', { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="25"
                max="400"
                className="pr-12"
              />
            )}
          </Field>
        </div>

        <Field label={t('activityLevel')} hint={t('activityLevelHint')}>
          {(props) => (
            <Select
              {...props}
              value={activityLevel}
              onValueChange={setActivityLevel}
              options={ACTIVITY_LEVELS.map((value) => ({ value, label: activityNames(value) }))}
            />
          )}
        </Field>

        <Field label={t('goal')}>
          {(props) => (
            <Select
              {...props}
              value={goal}
              onValueChange={setGoal}
              options={GOALS.map((value) => ({ value, label: goalNames(value) }))}
            />
          )}
        </Field>

        <Field label={t('language')} hint={t('languageHint')}>
          {(props) => (
            <Select
              {...props}
              value={language}
              onValueChange={setLanguage}
              options={LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))}
            />
          )}
        </Field>

        <Field label={t('timezone')} hint={t('timezoneHint')}>
          {(props) => (
            <NativeSelect {...props} value={zone} onChange={(event) => setZone(event.target.value)}>
              {listTimeZones(profile.timezone).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>

        <Button type="submit" disabled={!changed || save.isPending}>
          {save.isPending ? common('saving') : t('saveProfile')}
        </Button>
      </form>
    </Section>
  );
};

const CalorieGoalSection = ({ profile }: { profile: Profile }) => {
  const t = useTranslations('settings');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { timezone } = useAuth();
  const format = useFormat();
  const { energy } = profile;
  const usingManual = profile.manualCalorieTargetKcal !== null;

  const today = todayIn(timezone);
  const target = useQuery({
    queryKey: queryKeys.target(today),
    queryFn: () => targetsApi.forDate(today),
  });

  const effectiveTarget = target.data?.calorieTargetKcal ?? Number.NaN;

  const schema = useMemo(
    () =>
      z.object({
        calorieTargetKcal: requiredNumber(
          t('goalRange', { min: MIN_CALORIE_TARGET, max: MAX_CALORIE_TARGET }),
          MIN_CALORIE_TARGET,
        ).refine(
          (value) => value <= MAX_CALORIE_TARGET,
          t('goalRange', { min: MIN_CALORIE_TARGET, max: MAX_CALORIE_TARGET }),
        ),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ calorieTargetKcal: number }>({
    resolver: zodResolver(schema),
    defaultValues: { calorieTargetKcal: effectiveTarget },
  });

  useEffect(() => {
    reset({ calorieTargetKcal: effectiveTarget });
  }, [effectiveTarget, reset]);

  const save = useMutation({
    mutationFn: profileApi.updateCalorieTarget,
    onSuccess: async (updated: Profile) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['target'] }),
      ]);
      showToast({ title: t('goalUpdated') });
    },
    onError: (error: unknown) => {
      showToast({
        title: t('goalFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  return (
    <Section title={t('calorieGoal')}>
      <div className="border-border bg-surface space-y-4 rounded-lg border px-4 py-4">
        {energy.isComplete ? (
          <dl className="border-border grid grid-cols-3 gap-4 border-b pb-4">
            <div>
              <dt className="label-caps">{t('bmr')}</dt>
              <dd className="metric-md mt-1.5">{format.kcal(energy.bmrKcal ?? 0)}</dd>
            </div>
            <div>
              <dt className="label-caps">{t('tdee')}</dt>
              <dd className="metric-md mt-1.5">{format.kcal(energy.tdeeKcal ?? 0)}</dd>
            </div>
            <div>
              <dt className="label-caps">{t('recommended')}</dt>
              <dd className="metric-md mt-1.5">
                {format.kcal(energy.recommendedCalorieTargetKcal ?? 0)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="bg-surface-muted text-foreground-muted rounded-md px-3 py-2.5 text-[0.8125rem]">
            {t('incompleteProfile')}
          </p>
        )}

        <form
          onSubmit={handleSubmit((values) =>
            save.mutate({ calorieTargetKcal: values.calorieTargetKcal }),
          )}
          noValidate
          className="space-y-3"
        >
          <Field
            label={t('dailyGoal')}
            error={errors.calorieTargetKcal?.message}
            suffix={units('kcal')}
            hint={
              usingManual
                ? t('manualHint')
                : energy.isComplete
                  ? t('recommendedHint')
                  : t('defaultHint')
            }
          >
            {(props) => (
              <Input
                {...props}
                {...register('calorieTargetKcal', { valueAsNumber: true })}
                type="number"
                inputMode="numeric"
                step="10"
                min={MIN_CALORIE_TARGET}
                max={MAX_CALORIE_TARGET}
                className="pr-16"
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? common('saving') : t('saveGoal')}
            </Button>
            {usingManual && energy.recommendedCalorieTargetKcal !== null ? (
              <Button
                type="button"
                variant="secondary"
                disabled={save.isPending}
                onClick={() => save.mutate({ calorieTargetKcal: null })}
              >
                {t('useRecommended')}
              </Button>
            ) : null}
          </div>
        </form>

        <p className="text-foreground-subtle text-xs">{t('formulaNote')}</p>
      </div>
    </Section>
  );
};

export default SettingsPage;
