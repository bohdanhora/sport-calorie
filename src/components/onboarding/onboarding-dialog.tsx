'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Footprints, Scale, Target, UtensilsCrossed } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ComponentType } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';
import { persistLocale } from '@/i18n/persist-locale';
import { ApiError } from '@/lib/api/client';
import { profileApi, type CompleteOnboardingInput } from '@/lib/api/endpoints';
import type { ActivityLevel, BiologicalSex, FitnessGoal, Profile } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { todayIn } from '@/lib/format/dates';
import { listTimeZones } from '@/lib/format/time-zones';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { requiredNumber, optionalNumber, toValue } from '@/lib/validation/numbers';

const ACTIVITY_LEVELS: ActivityLevel[] = ['SEDENTARY', 'LIGHT', 'MODERATE', 'HIGH', 'VERY_HIGH'];
const GOALS: FitnessGoal[] = ['LOSE_WEIGHT', 'MAINTAIN_WEIGHT', 'GAIN_WEIGHT'];
const GUIDE_POINTS = ['food', 'activity', 'weight', 'goal'] as const;
const FORM_STEPS = ['guide', 'body', 'goal', 'preferences'] as const;

const MIN_CALORIE_TARGET = 800;
const MAX_CALORIE_TARGET = 8000;

type Step = (typeof FORM_STEPS)[number] | 'summary';

const GUIDE_ICONS: Record<(typeof GUIDE_POINTS)[number], ComponentType<{ className?: string }>> = {
  food: UtensilsCrossed,
  activity: Footprints,
  weight: Scale,
  goal: Target,
};

interface OnboardingValues {
  displayName: string;
  birthDate: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
}

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | undefined;
  /** The guide on its own, for someone who wants to read it again. */
  guideOnly?: boolean;
}

export const OnboardingDialog = ({
  open,
  onOpenChange,
  profile,
  guideOnly = false,
}: OnboardingDialogProps) => {
  const t = useTranslations('onboarding');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const settings = useTranslations('settings');
  const activityNames = useTranslations('activityLevels');
  const goalNames = useTranslations('goals');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, timezone } = useAuth();

  const [step, setStep] = useState<Step>('guide');
  const [sex, setSex] = useState<BiologicalSex | ''>(profile?.sex ?? '');
  const [sexError, setSexError] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activityLevel ?? 'LIGHT',
  );
  const [goal, setGoal] = useState<FitnessGoal>(profile?.goal ?? 'MAINTAIN_WEIGHT');
  const [language, setLanguage] = useState<Locale>(locale);
  const [zone, setZone] = useState(profile?.timezone ?? timezone);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Profile | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        displayName: z.string().trim().max(80),
        birthDate: z.string().min(1, t('birthDateRequired')),
        heightCm: requiredNumber(t('heightRequired'), 80),
        currentWeightKg: requiredNumber(t('weightRequired'), 25),
        targetWeightKg: optionalNumber(settings('targetWeightInvalid'), 25),
      }),
    [settings, t],
  );

  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile?.displayName ?? user?.displayName ?? '',
      birthDate: profile?.birthDate ?? '',
      heightCm: profile?.heightCm ?? Number.NaN,
      currentWeightKg: profile?.currentWeightKg ?? Number.NaN,
      targetWeightKg: profile?.targetWeightKg ?? Number.NaN,
    },
  });

  const complete = useMutation({
    mutationFn: (input: CompleteOnboardingInput) => profileApi.completeOnboarding(input),
    onSuccess: async (updated: Profile) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['target'] }),
        queryClient.invalidateQueries({ queryKey: ['weight'] }),
      ]);

      setSaved(updated);
      setStep('summary');

      if (updated.locale !== locale) {
        persistLocale(updated.locale as Locale);
        router.refresh();
      }
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : t('saveFailed'));
    },
  });

  const goNext = async () => {
    setFormError(null);

    if (step === 'guide') {
      setStep('body');
      return;
    }

    if (step === 'body') {
      const valid = await trigger(['birthDate', 'heightCm', 'currentWeightKg', 'displayName']);
      setSexError(sex ? null : t('sexRequired'));

      if (valid && sex) {
        setStep('goal');
      }

      return;
    }

    if (step === 'goal') {
      if (await trigger(['targetWeightKg'])) {
        setStep('preferences');
      }

      return;
    }

    if (step === 'preferences' && sex) {
      const values = getValues();

      complete.mutate({
        displayName: values.displayName.trim() || null,
        sex,
        birthDate: values.birthDate,
        heightCm: values.heightCm,
        currentWeightKg: values.currentWeightKg,
        targetWeightKg: toValue(values.targetWeightKg),
        activityLevel,
        goal,
        timezone: zone,
        locale: language,
      });
    }
  };

  const goBack = () => {
    setFormError(null);
    const index = FORM_STEPS.indexOf(step as (typeof FORM_STEPS)[number]);

    if (index > 0) {
      setStep(FORM_STEPS[index - 1]);
    }
  };

  const stepIndex = FORM_STEPS.indexOf(step as (typeof FORM_STEPS)[number]);
  const sexOptions = [
    { value: 'MALE' as const, label: settings('male') },
    { value: 'FEMALE' as const, label: settings('female') },
  ];

  const titles: Record<Step, string> = {
    guide: t('welcomeTitle'),
    body: t('bodyTitle'),
    goal: t('goalTitle'),
    preferences: t('preferencesTitle'),
    summary: t('summaryTitle'),
  };

  const descriptions: Record<Step, string> = {
    guide: t('welcomeSubtitle'),
    body: t('bodySubtitle'),
    goal: t('goalSubtitle'),
    preferences: t('preferencesSubtitle'),
    summary: t('summarySubtitle'),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={titles[step]}
      description={descriptions[step]}
      dismissible={guideOnly}
    >
      <div className="space-y-5">
        {guideOnly || step === 'summary' ? null : (
          <ol className="flex items-center gap-1.5" aria-label={t('progress')}>
            {FORM_STEPS.map((name, index) => (
              <li
                key={name}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={
                  index <= stepIndex
                    ? 'bg-accent h-1 flex-1 rounded-full'
                    : 'bg-surface-muted h-1 flex-1 rounded-full'
                }
              />
            ))}
          </ol>
        )}

        {step === 'guide' ? (
          <ul className="space-y-3">
            {GUIDE_POINTS.map((point) => {
              const Icon = GUIDE_ICONS[point];

              return (
                <li key={point} className="flex gap-3">
                  <span className="bg-surface-muted text-accent flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(`guide.${point}.title`)}</p>
                    <p className="text-foreground-muted mt-0.5 text-[0.8125rem]">
                      {t(`guide.${point}.body`)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {step === 'body' ? (
          <div className="space-y-4">
            <Field label={settings('name')} optional>
              {(props) => <Input {...props} {...register('displayName')} className="font-sans" />}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={settings('sex')}
                hint={settings('sexHint')}
                error={sexError ?? undefined}
              >
                {(props) => (
                  <Select
                    {...props}
                    value={sex}
                    onValueChange={(value) => {
                      setSex(value);
                      setSexError(null);
                    }}
                    options={sexOptions}
                    placeholder={common('notSet')}
                  />
                )}
              </Field>

              <Field label={settings('birthDate')} error={errors.birthDate?.message}>
                {(props) => (
                  <Input {...props} {...register('birthDate')} type="date" max={todayIn('UTC')} />
                )}
              </Field>

              <Field
                label={settings('height')}
                error={errors.heightCm?.message}
                suffix={units('centimetre')}
              >
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
                label={t('currentWeight')}
                error={errors.currentWeightKg?.message}
                suffix={units('kilogram')}
              >
                {(props) => (
                  <Input
                    {...props}
                    {...register('currentWeightKg', { valueAsNumber: true })}
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
          </div>
        ) : null}

        {step === 'goal' ? (
          <div className="space-y-4">
            <Field label={settings('goal')}>
              {(props) => (
                <Select
                  {...props}
                  value={goal}
                  onValueChange={setGoal}
                  options={GOALS.map((value) => ({ value, label: goalNames(value) }))}
                />
              )}
            </Field>

            <Field label={settings('activityLevel')} hint={settings('activityLevelHint')}>
              {(props) => (
                <Select
                  {...props}
                  value={activityLevel}
                  onValueChange={setActivityLevel}
                  options={ACTIVITY_LEVELS.map((value) => ({ value, label: activityNames(value) }))}
                />
              )}
            </Field>

            <Field
              label={settings('targetWeight')}
              error={errors.targetWeightKg?.message}
              suffix={units('kilogram')}
              optional
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
        ) : null}

        {step === 'preferences' ? (
          <div className="space-y-4">
            <Field label={settings('language')} hint={settings('languageHint')}>
              {(props) => (
                <Select
                  {...props}
                  value={language}
                  onValueChange={setLanguage}
                  options={LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))}
                />
              )}
            </Field>

            <Field label={settings('timezone')} hint={settings('timezoneHint')}>
              {(props) => (
                <NativeSelect
                  {...props}
                  value={zone}
                  onChange={(event) => setZone(event.target.value)}
                >
                  {listTimeZones(zone).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>

            <p className="bg-surface-muted text-foreground-muted rounded-md px-3 py-2.5 text-[0.8125rem]">
              {t('targetNote')}
            </p>
          </div>
        ) : null}

        {step === 'summary' && saved ? (
          <OnboardingSummary profile={saved} onProfileChange={setSaved} />
        ) : null}

        {formError ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger animate-row rounded-md px-3 py-2 text-[0.8125rem]"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          {guideOnly ? (
            <>
              <span />
              <Button onClick={() => onOpenChange(false)}>{common('close')}</Button>
            </>
          ) : step === 'summary' ? (
            <>
              <span />
              <Button
                size="lg"
                onClick={() => {
                  showToast({ title: t('finished') });
                  onOpenChange(false);
                }}
              >
                {t('start')}
              </Button>
            </>
          ) : (
            <>
              {stepIndex > 0 ? (
                <Button variant="ghost" onClick={goBack} disabled={complete.isPending}>
                  {common('back')}
                </Button>
              ) : (
                <span />
              )}
              <Button size="lg" onClick={() => void goNext()} disabled={complete.isPending}>
                {step === 'preferences'
                  ? complete.isPending
                    ? common('saving')
                    : t('finish')
                  : t('next')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

const OnboardingSummary = ({
  profile,
  onProfileChange,
}: {
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
}) => {
  const t = useTranslations('onboarding');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const settings = useTranslations('settings');
  const format = useFormat();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const effective = profile.manualCalorieTargetKcal ?? profile.energy.recommendedCalorieTargetKcal;
  const [value, setValue] = useState(String(effective ?? ''));

  const override = useMutation({
    mutationFn: profileApi.updateCalorieTarget,
    onSuccess: async (updated: Profile) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['target'] }),
      ]);
      onProfileChange(updated);
      showToast({ title: settings('goalUpdated') });
    },
    onError: (error: unknown) => {
      showToast({
        title: settings('goalFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const parsed = Number(value);
  const canSave =
    value.trim() !== '' &&
    Number.isFinite(parsed) &&
    parsed >= MIN_CALORIE_TARGET &&
    parsed <= MAX_CALORIE_TARGET &&
    parsed !== effective;

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface rounded-lg border px-4 py-4 text-center">
        <p className="label-caps">{t('dailyTarget')}</p>
        <p className="metric-lg mt-1.5">
          {effective !== null ? format.kcal(effective) : '—'}
          <span className="text-foreground-subtle ml-1 text-xs font-normal">{units('kcal')}</span>
        </p>
        {profile.energy.isComplete ? (
          <p className="text-foreground-subtle mt-2 text-xs">
            {t('derivedFrom', {
              bmr: format.kcal(profile.energy.bmrKcal ?? 0),
              tdee: format.kcal(profile.energy.tdeeKcal ?? 0),
            })}
          </p>
        ) : null}
      </div>

      <Field label={t('adjustTarget')} hint={t('adjustTargetHint')} suffix={units('kcal')}>
        {(props) => (
          <Input
            {...props}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type="number"
            inputMode="numeric"
            step="10"
            min={MIN_CALORIE_TARGET}
            max={MAX_CALORIE_TARGET}
            className="pr-16"
          />
        )}
      </Field>

      <Button
        variant="secondary"
        disabled={!canSave || override.isPending}
        onClick={() => override.mutate({ calorieTargetKcal: parsed })}
      >
        {override.isPending ? common('saving') : settings('saveGoal')}
      </Button>
    </div>
  );
};
