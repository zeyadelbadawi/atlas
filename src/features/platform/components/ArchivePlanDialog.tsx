/**
 * Plan management — archive a plan (`POST platform-plans/:key/archive`).
 *
 * WHAT ARCHIVING DOES, SAID PLAINLY (owner decision). Customers can no
 * longer choose the plan. Organizations on it keep it until their current
 * period ends; after that they can't renew on it and must choose another
 * plan. Founding Academies locked to it lose their lock at renewal for the
 * same reason. The confirmation shows how many organizations that reaches
 * — paying, on a trial, switching in at renewal, founding — before the
 * owner confirms.
 *
 * Refusals stay in the dialog: a stale version ("someone else changed
 * it"), already archived, or the last plan customers can see (the server
 * keeps at least one listed plan) — each with its own sentence. Archiving
 * is never deletion; Restore brings the plan back.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@app/providers';
import { SaveFailedAlert } from '@forms';
import { useBidiIsolation } from '@hooks';
import { resolvePlanName } from '@features/tenant';
import { formatNumber } from '@utils';
import type { LanguageCode, PlatformPlanRow } from '@types';
import { useArchivePlan } from '../hooks/usePlatformPlans';
import { PLAN_ERROR_KEYS } from '../utils/plan-management.utils';

const K = 'platform:planAdmin.archive';

export interface ArchivePlanDialogProps {
  /** The plan to archive; `null` closes the dialog. */
  readonly plan: PlatformPlanRow | null;
  readonly onClose: () => void;
}

export function ArchivePlanDialog({
  plan,
  onClose,
}: ArchivePlanDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { isolate } = useBidiIsolation();
  const { notifySuccess } = useToast();
  const archive = useArchivePlan();

  const resetArchive = archive.reset;
  useEffect(() => {
    if (plan) resetArchive();
    // Only when a different plan is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const name = plan ? resolvePlanName(plan, language) : '';
  const error = archive.error ?? null;
  const knownRefusal =
    error?.messageKey === PLAN_ERROR_KEYS.alreadyArchived ||
    error?.messageKey === PLAN_ERROR_KEYS.lastListedPlan;
  const isStale = error?.kind === 'conflict' && !knownRefusal;
  const showFailure = error !== null && !isStale && error.kind !== 'cancelled';

  const requestClose = () => {
    if (!archive.isPending) onClose();
  };

  const handleConfirm = async (): Promise<void> => {
    if (!plan || archive.isPending) return;
    try {
      await archive.mutateAsync({
        key: plan.key,
        expectedVersion: plan.version,
      });
    } catch {
      // Shown in the dialog, once.
      return;
    }
    notifySuccess(`${K}.archivedTitle`, `${K}.archivedDescription`, {
      plan: name,
    });
    onClose();
  };

  const counts = plan?.subscribers;
  const rows = [
    { id: 'paying', label: `${K}.paying`, value: counts?.paying },
    { id: 'trialing', label: `${K}.trialing`, value: counts?.trialing },
    {
      id: 'scheduled-in',
      label: `${K}.scheduledIn`,
      value: counts?.scheduledIn,
    },
    { id: 'founding', label: `${K}.founding`, value: counts?.foundingLocks },
  ];

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent className="max-w-lg" data-testid="archive-plan-dialog">
        <DialogHeader>
          <DialogTitle>{t(`${K}.title`, { plan: isolate(name) })}</DialogTitle>
          <DialogDescription>{t(`${K}.description`)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section aria-labelledby="archive-plan-counts-title">
            <h3
              id="archive-plan-counts-title"
              className="mb-2 text-sm font-semibold"
            >
              {t(`${K}.countsTitle`)}
            </h3>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-md border border-border p-2"
                >
                  <dt className="text-xs text-muted-foreground">
                    {t(row.label)}
                  </dt>
                  <dd
                    className="text-lg font-semibold tabular-nums"
                    data-testid={`archive-count-${row.id}`}
                  >
                    {formatNumber(row.value ?? 0, language)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <Alert variant="destructive" data-testid="archive-plan-consequence">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription className="space-y-2">
              <p>{t(`${K}.consequence`)}</p>
              <p>{t(`${K}.foundingConsequence`)}</p>
            </AlertDescription>
          </Alert>

          {isStale ? (
            <p
              role="alert"
              data-testid="archive-plan-stale"
              className="text-sm text-destructive"
            >
              {t(`${K}.stale`)}
            </p>
          ) : null}
          {showFailure && error ? (
            <SaveFailedAlert error={error} titleKey={`${K}.failed`} />
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={archive.isPending}
            onClick={requestClose}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="archive-plan-confirm"
            disabled={archive.isPending}
            onClick={() => void handleConfirm()}
          >
            {archive.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {archive.isPending ? t(`${K}.archiving`) : t(`${K}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
