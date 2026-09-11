/**
 * Website Publish Bar.
 *
 * The one shared publish control, used by both the Settings and Page
 * Editor surfaces — never a bespoke publish button per page. Never shows
 * "Published" until the backend response confirms it; never auto-retries
 * a failed publish (see `Reports/ARCHITECTURE.md`, Prompt 9, "Draft /
 * Publish Model").
 *
 * THE BUTTON IS A FUNCTION OF THE PERSISTED STATE, NOT A LOCAL TOGGLE.
 * `status` arrives from `WebsiteConfiguration.status` — the same column
 * the public runtime filters on — so a refresh, a navigation, or another
 * admin acting in a different tab all produce the correct label with no
 * client-side state to drift. There is deliberately no `useState` mirror
 * of the published flag anywhere in this component.
 */
import { useTranslation } from 'react-i18next';
import { CloudOff, CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { useConfirmDialog } from '@app/providers';
import { usePermissions } from '@hooks';
import { usePublishWebsite, useUnpublishWebsite } from '../hooks';
import type { StatusTone } from '@components/data-display';
import type { WebsitePublishStatus } from '@types';

const STATUS_TONE: Record<WebsitePublishStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  publishing: 'info',
  failed: 'destructive',
};

export interface WebsitePublishBarProps {
  readonly academyId: string;
  readonly status: WebsitePublishStatus;
  /**
   * When the site was last published, if ever. Only used to tell "never
   * published" apart from "published, then taken offline" — both of which
   * are `status: 'draft'`.
   */
  readonly lastPublishedAt?: string;
}

export function WebsitePublishBar({
  academyId,
  status,
  lastPublishedAt,
}: WebsitePublishBarProps): JSX.Element {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const publish = usePublishWebsite();
  const unpublish = useUnpublishWebsite();
  // Unpublishing takes a customer's site off the internet, so it is gated
  // on the same permission as publishing — never a weaker one.
  const canPublish = hasPermission('academy.website.publish');

  const isPublished = status === 'published';
  const action = isPublished ? unpublish : publish;
  // One in-flight guard covering both mutations: the button is disabled
  // while either is pending, so a double click cannot queue a publish
  // behind an unpublish.
  const isBusy =
    publish.isPending || unpublish.isPending || status === 'publishing';

  const handleToggle = async () => {
    if (isBusy) return;
    const confirmed = await confirm(
      isPublished
        ? {
            titleKey: 'website:publish.unpublishConfirmTitle',
            descriptionKey: 'website:publish.unpublishConfirmDescription',
            confirmLabelKey: 'website:publish.unpublishConfirmAction',
            intent: 'destructive',
          }
        : {
            titleKey: 'website:publish.confirmTitle',
            descriptionKey: 'website:publish.confirmDescription',
            confirmLabelKey: 'website:publish.confirmAction',
          }
    );
    if (!confirmed) return;
    // `mutate` resolves into the query cache; the badge and the label both
    // re-derive from the refetched persisted status, so nothing here
    // claims success on its own.
    action.mutate(academyId);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <StatusBadge
          labelKey={`website:publish.status.${status}`}
          tone={STATUS_TONE[status]}
        />
        <span className="text-sm text-muted-foreground">
          {status === 'draft'
            ? // A site that has been published before and then taken
              // offline is also `draft`, but "not published yet" would be
              // wrong for it — `publishedAt` is what distinguishes the two.
              lastPublishedAt
              ? t('website:publish.unpublishedHint')
              : t('website:publish.draftHint')
            : status === 'published'
              ? t('website:publish.publishedHint')
              : null}
        </span>
      </div>
      {canPublish ? (
        <Button
          type="button"
          data-testid="website-publish-toggle"
          variant={isPublished ? 'outline' : 'default'}
          onClick={handleToggle}
          disabled={isBusy}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : isPublished ? (
            <CloudOff className="size-4" strokeWidth={2} aria-hidden />
          ) : (
            <CloudUpload className="size-4" strokeWidth={2} aria-hidden />
          )}
          {t(
            isPublished
              ? 'website:publish.unpublishAction'
              : 'website:publish.action'
          )}
        </Button>
      ) : null}
      {/* A failed publish or unpublish must never look like it worked: the
          badge still shows the real persisted status, and the error is
          surfaced with a retry rather than swallowed. */}
      {action.error ? (
        <ErrorState onRetry={handleToggle} className="w-full" />
      ) : null}
    </div>
  );
}
