/**
 * What happened after a delete — the refusals a person has to act on.
 *
 * Always mounted as a polite live region so screen readers hear the
 * result when it appears, not only sighted users scanning for a banner.
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';
import type { MediaDeletionOutcome } from '../hooks/useMediaDeletion';
import {
  describeMediaUsages,
  includesSubmission,
} from '../utils/media-delete-copy';

export interface MediaDeleteOutcomeProps {
  readonly outcome: MediaDeletionOutcome | null;
  readonly onDismiss: () => void;
  readonly className?: string;
}

export function MediaDeleteOutcome({
  outcome,
  onDismiss,
  className,
}: MediaDeleteOutcomeProps): JSX.Element {
  const { t, i18n } = useTranslation();

  const hasProblem =
    outcome?.kind === 'error' ||
    (outcome?.kind === 'bulk' && outcome.refused.length > 0);

  return (
    <div role="status" aria-live="polite" className={className}>
      {outcome ? (
        <div
          data-testid="media-delete-outcome"
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 text-sm',
            hasProblem
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-border bg-muted/40'
          )}
        >
          <div className="min-w-0 flex-1 space-y-2">
            {outcome.kind === 'error' ? (
              <p className="text-foreground">{outcome.message}</p>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  {outcome.refused.length === 0
                    ? t('media:delete.summary.deleted', {
                        count: outcome.deletedCount,
                      })
                    : outcome.deletedCount === 0
                      ? t('media:delete.summary.refused', {
                          count: outcome.refused.length,
                        })
                      : t('media:delete.summary.headline', {
                          deleted: t('media:delete.summary.deleted', {
                            count: outcome.deletedCount,
                          }),
                          refused: t('media:delete.summary.refused', {
                            count: outcome.refused.length,
                          }),
                        })}
                </p>
                {outcome.refused.length > 0 ? (
                  <ul className="list-disc space-y-1 ps-5 text-foreground">
                    {outcome.refused.map((item) => (
                      <li key={item.id} className="break-words">
                        {item.reason === 'inUse'
                          ? t('media:delete.summary.refusedInUse', {
                              fileName: item.fileName,
                              usages: describeMediaUsages(
                                t,
                                i18n.language,
                                item.usages
                              ),
                            })
                          : t('media:delete.summary.refusedNotFound', {
                              fileName: item.fileName,
                            })}
                        {item.reason === 'inUse' &&
                        includesSubmission(item.usages)
                          ? ` ${t('media:delete.submissionNote')}`
                          : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {outcome.deletedCount > 0 ? (
                  <p className="text-muted-foreground">
                    {t('media:delete.summary.graceNote')}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onDismiss}
            aria-label={t('media:delete.summary.dismiss')}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
