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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudOff, CloudUpload, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { useConfirmDialog } from '@app/providers';
import { usePermissions } from '@hooks';
import {
  usePublishWebsite,
  useUnpublishWebsite,
  useWebsitePages,
} from '../hooks';
import { CONTENT_LIST_PAGE_SIZE } from '../constants/website.constants';
import { collectSampleContent } from '../utils/sample-content.utils';
import { SampleContentList } from './SampleContentList';
import type { StatusTone } from '@components/data-display';
import type {
  SampleContentEntry,
  WebsitePublishStatus,
  WebsiteUnpublishedChanges,
} from '@types';

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
  /** What is saved but not yet live (from `WebsiteConfiguration`). */
  readonly unpublishedChanges?: WebsiteUnpublishedChanges;
}

export function WebsitePublishBar({
  academyId,
  status,
  lastPublishedAt,
  unpublishedChanges,
}: WebsitePublishBarProps): JSX.Element {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const publish = usePublishWebsite();
  const unpublish = useUnpublishWebsite();
  // Theme 1 plan §D.4 — the saved pages, to warn about sample testimonials
  // before publishing. Same query key as the overview's page list.
  const pagesQuery = useWebsitePages(academyId, {
    query: { pagination: { page: 1, pageSize: CONTENT_LIST_PAGE_SIZE } },
  });
  // Unpublishing takes a customer's site off the internet, so it is gated
  // on the same permission as publishing — never a weaker one.
  const canPublish = hasPermission('academy.website.publish');

  const isPublished = status === 'published';
  const pendingPages = unpublishedChanges?.pages ?? 0;
  const pendingSettings = unpublishedChanges?.configuration ?? false;
  const hasPendingChanges = pendingSettings || pendingPages > 0;
  // The last action taken, for the error strip and its retry.
  const [lastAction, setLastAction] = useState<'publish' | 'unpublish'>(
    'publish'
  );
  const failed = lastAction === 'publish' ? publish.error : unpublish.error;
  // One in-flight guard covering both mutations: every button is disabled
  // while either is pending, so a double click cannot queue a publish
  // behind an unpublish.
  const isBusy =
    publish.isPending || unpublish.isPending || status === 'publishing';

  // Theme 1 plan §D.4 — the sections still holding sample testimonials,
  // while the warning is open.
  const [sampleWarning, setSampleWarning] = useState<
    readonly SampleContentEntry[] | null
  >(null);

  const handlePublish = async () => {
    if (isBusy) return;
    setLastAction('publish');
    const samples = collectSampleContent(pagesQuery.data?.items ?? []);
    if (samples.length > 0) {
      // A warning, never a block: samples are stripped from the public
      // site anyway, so publishing hides those testimonials. The dialog
      // lists them, each with a way to review it.
      setSampleWarning(samples);
      return;
    }
    const confirmed = await confirm(
      isPublished
        ? {
            titleKey: 'website:publish.publishChangesConfirmTitle',
            descriptionKey: 'website:publish.publishChangesConfirmDescription',
            confirmLabelKey: 'website:publish.publishChangesAction',
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
    publish.mutate(academyId);
  };

  const handleUnpublish = async () => {
    if (isBusy) return;
    setLastAction('unpublish');
    const confirmed = await confirm({
      titleKey: 'website:publish.unpublishConfirmTitle',
      descriptionKey: 'website:publish.unpublishConfirmDescription',
      confirmLabelKey: 'website:publish.unpublishConfirmAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    unpublish.mutate(academyId);
  };

  const pendingSummary = pendingSettings
    ? pendingPages > 0
      ? t('website:publish.pending.settingsAndPages', { count: pendingPages })
      : t('website:publish.pending.settings')
    : t('website:publish.pending.pages', { count: pendingPages });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <StatusBadge
          labelKey={`website:publish.status.${status}`}
          tone={STATUS_TONE[status]}
        />
        <span
          className="text-sm text-muted-foreground"
          data-testid="website-publish-hint"
        >
          {status === 'draft'
            ? // A site that has been published before and then taken
              // offline is also `draft`, but "not published yet" would be
              // wrong for it — `publishedAt` is what distinguishes the two.
              lastPublishedAt
              ? t('website:publish.unpublishedHint')
              : t('website:publish.draftHint')
            : status === 'published'
              ? hasPendingChanges
                ? `${t('website:publish.publishedHint')} ${pendingSummary}`
                : t('website:publish.upToDateHint')
              : null}
        </span>
      </div>
      {canPublish ? (
        <div className="flex flex-wrap items-center gap-2">
          {isPublished ? (
            <>
              <Button
                type="button"
                data-testid="website-publish-changes"
                onClick={handlePublish}
                disabled={isBusy || !hasPendingChanges}
              >
                {publish.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <UploadCloud className="size-4" strokeWidth={2} aria-hidden />
                )}
                {t('website:publish.publishChangesAction')}
              </Button>
              <Button
                type="button"
                data-testid="website-publish-toggle"
                variant="outline"
                onClick={handleUnpublish}
                disabled={isBusy}
              >
                {unpublish.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <CloudOff className="size-4" strokeWidth={2} aria-hidden />
                )}
                {t('website:publish.unpublishAction')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              data-testid="website-publish-toggle"
              onClick={handlePublish}
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <CloudUpload className="size-4" strokeWidth={2} aria-hidden />
              )}
              {t('website:publish.action')}
            </Button>
          )}
        </div>
      ) : null}
      {/* A failed publish or unpublish must never look like it worked: the
          badge still shows the real persisted status, and the error is
          surfaced with a retry rather than swallowed. */}
      {failed ? (
        <ErrorState
          onRetry={lastAction === 'publish' ? handlePublish : handleUnpublish}
          className="w-full"
        />
      ) : null}

      <AlertDialog
        open={sampleWarning !== null}
        onOpenChange={(open) => {
          if (!open) setSampleWarning(null);
        }}
      >
        <AlertDialogContent data-testid="publish-sample-warning">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('website:publish.sampleWarningTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('website:publish.sampleWarningDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sampleWarning ? (
            <SampleContentList
              academyId={academyId}
              entries={sampleWarning}
              onNavigate={() => setSampleWarning(null)}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSampleWarning(null);
                publish.mutate(academyId);
              }}
            >
              {t('website:publish.sampleWarningAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
