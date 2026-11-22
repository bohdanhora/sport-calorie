'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowUp, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { AnswerText } from '@/components/assistant/answer-text';
import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { assistantApi, nutritionProviderApi } from '@/lib/api/endpoints';
import type { AssistantDetail, AssistantMessage } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { addDays, todayIn } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

const RANGES = [
  { value: '7', key: 'days7' },
  { value: '30', key: 'days30' },
  { value: '90', key: 'months3' },
  { value: '365', key: 'year' },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

const SUGGESTIONS = ['analyseMonth', 'lapses', 'improve', 'protein'] as const;

const HISTORY_MESSAGES = 6;
const STORAGE_PREFIX = 'sc.assistant.';

interface Turn extends AssistantMessage {
  from?: string;
  to?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
}

const readTurns = (key: string): Turn[] => {
  try {
    const stored = window.localStorage.getItem(key);

    return stored ? (JSON.parse(stored) as Turn[]) : [];
  } catch {
    return [];
  }
};

const writeTurns = (key: string, turns: Turn[]): void => {
  try {
    if (turns.length > 0) {
      window.localStorage.setItem(key, JSON.stringify(turns));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {}
};

const AssistantPage = () => {
  const t = useTranslations('assistant');
  const ranges = useTranslations('progress');
  const locale = useLocale();
  const format = useFormat();
  const { user, timezone } = useAuth();
  const storageKey = `${STORAGE_PREFIX}${user?.id ?? 'anonymous'}`;

  const [range, setRange] = useState<RangeValue>('30');
  const [detail, setDetail] = useState<AssistantDetail>('auto');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const provider = useQuery({
    queryKey: queryKeys.nutritionProvider,
    queryFn: nutritionProviderApi.get,
  });

  useEffect(() => {
    setTurns(readTurns(storageKey));
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) {
      writeTurns(storageKey, turns);
    }
  }, [loaded, storageKey, turns]);

  const ask = useMutation({
    mutationFn: (conversation: Turn[]) => {
      const to = todayIn(timezone);

      return assistantApi.ask({
        messages: conversation
          .slice(-HISTORY_MESSAGES)
          .map(({ role, content }) => ({ role, content })),
        from: addDays(to, -(Number(range) - 1)),
        to,
        locale,
        detail,
      });
    },
    onSuccess: (answer) =>
      setTurns((current) => [
        ...current,
        {
          role: 'assistant',
          content: answer.answer,
          from: answer.from,
          to: answer.to,
          promptTokens: answer.promptTokens,
          completionTokens: answer.completionTokens,
        },
      ]),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, ask.isPending]);

  const send = (text: string) => {
    const content = text.trim();

    if (!content || ask.isPending) {
      return;
    }

    const conversation: Turn[] = [...turns, { role: 'user', content }];

    setTurns(conversation);
    setDraft('');
    ask.mutate(conversation);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  const clear = () => {
    ask.reset();
    setTurns([]);
  };

  const count = new Intl.NumberFormat(format.locale);
  const describeAnswer = (turn: Turn): string =>
    [
      turn.from && turn.to ? `${format.shortDate(turn.from)} - ${format.shortDate(turn.to)}` : null,
      turn.promptTokens != null
        ? t('tokens', {
            sent: count.format(turn.promptTokens),
            received: count.format(turn.completionTokens ?? 0),
          })
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

  const lastTurn = turns.at(-1);
  const failed = ask.isError && lastTurn?.role === 'user';

  return (
    <div className="space-y-7">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{t('title')}</h1>
            <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
          </div>
          {turns.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clear} disabled={ask.isPending}>
              <RotateCcw className="size-4" aria-hidden />
              {t('clear')}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Segmented
            label={t('period')}
            value={range}
            onChange={setRange}
            options={RANGES.map(({ value, key }) => ({
              value,
              label: key === 'year' ? t('year') : ranges(key),
            }))}
          />
          <Segmented
            label={t('detail')}
            value={detail}
            onChange={setDetail}
            options={[
              { value: 'auto', label: t('detailAuto') },
              { value: 'full', label: t('detailFull') },
            ]}
          />
        </div>
        <p className="text-foreground-subtle text-xs leading-relaxed">
          {detail === 'auto' ? t('detailAutoHint') : t('detailFullHint')}
        </p>
      </header>

      {provider.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : !provider.data?.isConfigured ? (
        <EmptyState
          title={t('noProvider')}
          description={t('noProviderHint')}
          action={
            <Button asChild size="sm">
              <Link href="/settings">{t('openSettings')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {turns.length === 0 ? (
            <section className="space-y-3">
              <h2 className="label-caps">{t('tryAsking')}</h2>
              <ul className="border-border bg-surface divide-border divide-y rounded-lg border">
                {SUGGESTIONS.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => send(t(`suggestions.${key}`))}
                      className="hover:bg-surface-muted focus-visible:bg-surface-muted flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150 focus-visible:outline-none"
                    >
                      <span aria-hidden className="bg-accent-ink size-1.5 shrink-0" />
                      {t(`suggestions.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <ol className="border-border bg-surface divide-border divide-y rounded-lg border">
              {turns.map((turn, index) => (
                <li key={index} className="animate-row space-y-2 px-4 py-4">
                  <p className="label-caps flex flex-wrap gap-x-2 gap-y-1">
                    <span className={turn.role === 'assistant' ? 'text-accent-ink' : undefined}>
                      {turn.role === 'user' ? t('you') : t('assistant')}
                    </span>
                    {turn.role === 'assistant' ? (
                      <span className="numeric normal-case">{describeAnswer(turn)}</span>
                    ) : null}
                  </p>
                  {turn.role === 'user' ? (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {turn.content}
                    </p>
                  ) : (
                    <AnswerText source={turn.content} />
                  )}
                </li>
              ))}

              {ask.isPending ? (
                <li className="space-y-2 px-4 py-4" aria-live="polite">
                  <p className="label-caps text-accent-ink">{t('assistant')}</p>
                  <p className="text-foreground-muted text-sm">
                    {t('thinking')}
                    <span aria-hidden className="caret caret-blink" />
                  </p>
                </li>
              ) : null}

              {failed ? (
                <li className="space-y-3 px-4 py-4" role="alert">
                  <p className="text-danger text-sm">
                    {ask.error instanceof ApiError ? ask.error.message : t('failed')}
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => ask.mutate(turns)}>
                    {t('retry')}
                  </Button>
                </li>
              ) : null}
            </ol>
          )}

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              maxLength={4000}
              rows={2}
              className="min-h-11 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              aria-label={t('send')}
              disabled={!draft.trim() || ask.isPending}
              className="shrink-0"
            >
              <ArrowUp className="size-4" aria-hidden />
            </Button>
          </form>
          <div ref={endRef} />
        </>
      )}
    </div>
  );
};

export default AssistantPage;
