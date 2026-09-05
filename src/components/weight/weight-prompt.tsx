'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { WeightDialog } from '@/components/weight/weight-dialog';
import { ApiError } from '@/lib/api/client';
import { weightApi } from '@/lib/api/endpoints';
import { addDays } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';

interface WeightPromptProps {
  /** Today in the user's timezone. The prompt only ever asks about today. */
  date: string;
  /** Whether today already has a weight; the prompt stays away if it does. */
  logged: boolean;
  /** The most recent earlier weigh-in, if there is one within reach. */
  previous: { date: string; weightKg: number } | null;
}

const SKIP_PREFIX = 'weight-prompt-skipped:';

/**
 * Asks for the day's weight once a day. Skipping is remembered per date in the
 * browser, so the answer holds until tomorrow instead of returning on every
 * navigation. Nothing about it reaches the API.
 */
export const WeightPrompt = ({ date, logged, previous }: WeightPromptProps) => {
  const t = useTranslations('weightPrompt');
  const form = useTranslations('weightForm');
  const units = useTranslations('units');
  const format = useFormat();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (logged) {
      setOpen(false);
      return;
    }

    let skipped = false;

    try {
      skipped = window.localStorage.getItem(`${SKIP_PREFIX}${date}`) === '1';
    } catch {
      // A browser that refuses storage just gets asked again; nothing breaks.
    }

    setOpen(!skipped);
  }, [date, logged]);

  const skip = () => {
    try {
      window.localStorage.setItem(`${SKIP_PREFIX}${date}`, '1');
    } catch {
      // Same as above: worth trying, not worth failing over.
    }

    setOpen(false);
  };

  const repeat = useMutation({
    mutationFn: (weightKg: number) => weightApi.upsert(date, weightKg, null),
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: form('saved') });
      setOpen(false);
    },
    onError: (error: unknown) => {
      showToast({
        title: form('saveFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const repeatLabel = previous
    ? previous.date === addDays(date, -1)
      ? t('sameAsYesterday', {
          weight: `${format.weight(previous.weightKg)} ${units('kilogram')}`,
        })
      : t('sameAsLast', {
          weight: `${format.weight(previous.weightKg)} ${units('kilogram')}`,
          date: format.shortDate(previous.date),
        })
    : null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : skip())}
        title={t('title')}
        description={t('subtitle')}
      >
        <div className="space-y-2.5">
          {previous && repeatLabel ? (
            <Button
              size="lg"
              className="w-full"
              disabled={repeat.isPending}
              onClick={() => repeat.mutate(previous.weightKg)}
            >
              {repeatLabel}
            </Button>
          ) : null}

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => {
              setOpen(false);
              setManualOpen(true);
            }}
          >
            {previous ? t('enterAnother') : t('enter')}
          </Button>

          <Button variant="ghost" size="lg" className="w-full" onClick={skip}>
            {t('notToday')}
          </Button>
        </div>
      </Dialog>

      <WeightDialog open={manualOpen} onOpenChange={setManualOpen} date={date} />
    </>
  );
};
