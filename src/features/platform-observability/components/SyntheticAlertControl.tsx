/**
 * Arms / resolves the synthetic test alert.
 *
 * This fires a REAL alert through Prometheus → Alertmanager → Slack, so
 * both directions go through the shared confirmation dialog, and nothing is
 * sent until the operator confirms. Out-of-range minutes never reach the
 * API. Errors are shown inline with the API's own copy.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@app/providers';
import { apiErrorMessage, formatDate, formatRelativeTime } from '@utils';
import type { LanguageCode, SyntheticAlertState } from '@types';
import {
  useArmSyntheticAlert,
  useResolveSyntheticAlert,
} from '../hooks/usePlatformObservability';
import {
  SYNTHETIC_ALERT_MAX_MINUTES,
  SYNTHETIC_ALERT_MIN_MINUTES,
} from '../services/PlatformObservabilityService';
import { useNow } from '../hooks/useNow';

const DEFAULT_MINUTES = 10;

export function SyntheticAlertControl({
  state,
}: {
  readonly state: SyntheticAlertState;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { confirm } = useConfirmDialog();
  const arm = useArmSyntheticAlert();
  const resolve = useResolveSyntheticAlert();
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  useNow(15_000);

  const parsed = Number(minutes);
  const valid =
    Number.isInteger(parsed) &&
    parsed >= SYNTHETIC_ALERT_MIN_MINUTES &&
    parsed <= SYNTHETIC_ALERT_MAX_MINUTES;
  const busy = arm.isPending || resolve.isPending;
  const mutationError = arm.error ?? resolve.error;

  const onArm = async () => {
    if (!valid) return;
    const confirmed = await confirm({
      titleKey:
        'platformObservability:configuration.synthetic.confirmArm.title',
      descriptionKey:
        'platformObservability:configuration.synthetic.confirmArm.description',
      confirmLabelKey:
        'platformObservability:configuration.synthetic.confirmArm.action',
      values: { count: parsed },
    });
    if (!confirmed) return;
    resolve.reset();
    arm.mutate(parsed);
  };

  const onResolve = async () => {
    const confirmed = await confirm({
      titleKey:
        'platformObservability:configuration.synthetic.confirmResolve.title',
      descriptionKey:
        'platformObservability:configuration.synthetic.confirmResolve.description',
      confirmLabelKey:
        'platformObservability:configuration.synthetic.confirmResolve.action',
      intent: 'destructive',
    });
    if (!confirmed) return;
    arm.reset();
    resolve.mutate();
  };

  return (
    <div className="space-y-4">
      <div role="status" aria-live="polite" className="text-sm">
        {state.armed ? (
          <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-surface px-4 py-3">
            <Timer
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden
            />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                {t('platformObservability:configuration.synthetic.armedTitle')}
              </p>
              {state.expiresAt ? (
                <p className="text-muted-foreground">
                  {t('platformObservability:configuration.synthetic.expires', {
                    time: formatDate(state.expiresAt, language, 'dateTime'),
                    relative: formatRelativeTime(state.expiresAt, language),
                  })}
                </p>
              ) : null}
              {state.armedAt ? (
                <p className="text-muted-foreground">
                  {state.armedBy
                    ? t(
                        'platformObservability:configuration.synthetic.armedAtBy',
                        {
                          time: formatDate(state.armedAt, language, 'dateTime'),
                          user: state.armedBy,
                        }
                      )
                    : t(
                        'platformObservability:configuration.synthetic.armedAt',
                        {
                          time: formatDate(state.armedAt, language, 'dateTime'),
                        }
                      )}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {t('platformObservability:configuration.synthetic.notArmed')}
          </p>
        )}
      </div>

      {state.armed ? (
        <Button
          type="button"
          variant="destructive"
          onClick={() => void onResolve()}
          disabled={busy}
        >
          {t('platformObservability:configuration.synthetic.resolveNow')}
        </Button>
      ) : (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void onArm();
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-foreground"
            >
              {t('platformObservability:configuration.synthetic.minutesLabel')}
            </label>
            <Input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={SYNTHETIC_ALERT_MIN_MINUTES}
              max={SYNTHETIC_ALERT_MAX_MINUTES}
              step={1}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="w-full sm:w-32"
              aria-describedby={valid ? hintId : `${hintId} ${errorId}`}
              aria-invalid={!valid}
            />
            <p id={hintId} className="text-xs text-muted-foreground">
              {t('platformObservability:configuration.synthetic.minutesHint', {
                min: SYNTHETIC_ALERT_MIN_MINUTES,
                max: SYNTHETIC_ALERT_MAX_MINUTES,
              })}
            </p>
            {!valid ? (
              <p id={errorId} className="text-xs font-medium text-destructive">
                {t(
                  'platformObservability:configuration.synthetic.minutesInvalid',
                  {
                    min: SYNTHETIC_ALERT_MIN_MINUTES,
                    max: SYNTHETIC_ALERT_MAX_MINUTES,
                  }
                )}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={!valid || busy}
            className="gap-1.5 sm:mb-6"
          >
            <FlaskConical className="size-4" aria-hidden />
            {t('platformObservability:configuration.synthetic.arm')}
          </Button>
        </form>
      )}

      {mutationError ? (
        <p
          role="alert"
          className="rounded-md bg-destructive-surface px-3 py-2 text-sm text-destructive"
        >
          {apiErrorMessage(t, i18n, mutationError)}
        </p>
      ) : null}
    </div>
  );
}
