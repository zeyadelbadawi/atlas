/**
 * Plan management — restore an archived plan
 * (`POST platform-plans/:key/restore {expectedVersion, displayOrder}`).
 *
 * The owner chooses where it goes: kept HIDDEN (`displayOrder` 0 — not
 * shown to customers, buyable by key only; the default, like a new plan)
 * or SHOWN to customers at a position, offered as the next free one (the
 * last listed position + 1). Organizations can choose and renew on it
 * again either way.
 *
 * A stale version says someone else changed it; "not archived" (someone
 * restored it first) and any other refusal are one inline alert; a
 * refused position lands on the position field.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@app/providers';
import {
  SaveFailedAlert,
  fieldErrorText,
  hasViolationOn,
  useFailureReason,
} from '@forms';
import { useBidiIsolation } from '@hooks';
import { resolvePlanName } from '@features/tenant';
import { formatNumber } from '@utils';
import type { LanguageCode, PlatformPlanRow } from '@types';
import { useRestorePlan } from '../hooks/usePlatformPlans';
import { positionIssue, wholeNumber } from '../schemas/plan-editor.schema';
import { PLAN_ERROR_KEYS } from '../utils/plan-management.utils';

const K = 'platform:planAdmin.restore';
const POSITION_FIELDS = { displayOrder: 'displayOrder' } as const;

type RestoreMode = 'hidden' | 'listed';

export interface RestorePlanDialogProps {
  /** The archived plan to restore; `null` closes the dialog. */
  readonly plan: PlatformPlanRow | null;
  /** The position offered when it is shown to customers. */
  readonly nextListedPosition: number;
  readonly onClose: () => void;
}

export function RestorePlanDialog({
  plan,
  nextListedPosition,
  onClose,
}: RestorePlanDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { isolate } = useBidiIsolation();
  const { notifySuccess } = useToast();
  const failureReason = useFailureReason();
  const restore = useRestorePlan();

  const [mode, setMode] = useState<RestoreMode>('hidden');
  const [position, setPosition] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const resetRestore = restore.reset;
  useEffect(() => {
    if (!plan) return;
    setMode('hidden');
    setPosition(String(nextListedPosition));
    setSubmitted(false);
    resetRestore();
    // Only when a different plan is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const name = plan ? resolvePlanName(plan, language) : '';
  const error = restore.error ?? null;
  const isStale =
    error?.kind === 'conflict' &&
    error.messageKey !== PLAN_ERROR_KEYS.notArchived;
  const positionServerError =
    error && hasViolationOn(error, POSITION_FIELDS)
      ? failureReason(error)
      : null;
  const showFailure =
    error !== null &&
    !isStale &&
    error.kind !== 'cancelled' &&
    positionServerError === null;

  const n = (value: number) => formatNumber(value, language);
  const positionProblem = mode === 'listed' ? positionIssue(position, n) : null;
  const positionError =
    (submitted && positionProblem
      ? fieldErrorText(t, positionProblem, t(`${K}.position`))
      : undefined) ??
    positionServerError ??
    undefined;

  const requestClose = () => {
    if (!restore.isPending) onClose();
  };

  const handleRestore = async (): Promise<void> => {
    if (!plan || restore.isPending) return;
    setSubmitted(true);
    if (positionProblem) return;
    const displayOrder = mode === 'listed' ? (wholeNumber(position) ?? 0) : 0;
    try {
      await restore.mutateAsync({
        key: plan.key,
        expectedVersion: plan.version,
        displayOrder,
      });
    } catch {
      // Shown in the dialog, once.
      return;
    }
    notifySuccess(
      `${K}.restoredTitle`,
      displayOrder > 0 ? `${K}.restoredListed` : `${K}.restoredHidden`,
      { plan: name, position: n(displayOrder) }
    );
    onClose();
  };

  const option = (
    value: RestoreMode,
    labelKey: string,
    helpKey: string
  ): JSX.Element => (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary">
      <input
        type="radio"
        name="restore-plan-mode"
        value={value}
        data-testid={`restore-plan-${value}`}
        checked={mode === value}
        onChange={() => {
          setMode(value);
          if (error) restore.reset();
        }}
        className="mt-1"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{t(labelKey)}</span>
        <span className="block text-xs text-muted-foreground">
          {t(helpKey)}
        </span>
      </span>
    </label>
  );

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent className="max-w-lg" data-testid="restore-plan-dialog">
        <DialogHeader>
          <DialogTitle>{t(`${K}.title`, { plan: isolate(name) })}</DialogTitle>
          <DialogDescription>{t(`${K}.description`)}</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRestore();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="sr-only">
              {t(`${K}.title`, { plan: name })}
            </legend>
            {option('hidden', `${K}.hiddenOption`, `${K}.hiddenOptionHelp`)}
            {option('listed', `${K}.listedOption`, `${K}.listedOptionHelp`)}
          </fieldset>

          {mode === 'listed' ? (
            <div className="space-y-1.5 sm:max-w-xs">
              <label
                htmlFor="restore-plan-position"
                className="text-sm font-medium"
              >
                {t(`${K}.position`)}
              </label>
              <Input
                id="restore-plan-position"
                data-testid="restore-plan-position"
                inputMode="numeric"
                dir="ltr"
                data-ltr-content
                autoComplete="off"
                value={position}
                aria-invalid={positionError ? true : undefined}
                aria-describedby={[
                  'restore-plan-position-help',
                  positionError ? 'restore-plan-position-error' : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onChange={(event) => {
                  setPosition(event.target.value);
                  if (error) restore.reset();
                }}
              />
              <p
                id="restore-plan-position-help"
                className="text-xs text-muted-foreground"
              >
                {t(`${K}.positionHelp`, { position: n(nextListedPosition) })}
              </p>
              {positionError ? (
                <p
                  id="restore-plan-position-error"
                  role="alert"
                  data-testid="restore-plan-position-error"
                  className="text-sm font-medium text-destructive"
                >
                  {positionError}
                </p>
              ) : null}
            </div>
          ) : null}

          {isStale ? (
            <p
              role="alert"
              data-testid="restore-plan-stale"
              className="text-sm text-destructive"
            >
              {t(`${K}.stale`)}
            </p>
          ) : null}
          {showFailure && error ? (
            <SaveFailedAlert error={error} titleKey={`${K}.failed`} />
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restore.isPending}
              onClick={requestClose}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="restore-plan-confirm"
              disabled={restore.isPending}
            >
              {restore.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {restore.isPending ? t(`${K}.restoring`) : t(`${K}.confirm`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
