/**
 * Website Publish Bar.
 *
 * The one shared publish control, used by both the Settings and Page
 * Editor surfaces — never a bespoke publish button per page. Never shows
 * "Published" until the backend response confirms it; never auto-retries
 * a failed publish (see `Reports/ARCHITECTURE.md`, Prompt 9, "Draft /
 * Publish Model").
 */
import { useTranslation } from 'react-i18next';
import { CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { useConfirmDialog } from '@app/providers';
import { usePermissions } from '@hooks';
import { usePublishWebsite } from '../hooks';
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
}

export function WebsitePublishBar({ academyId, status }: WebsitePublishBarProps): JSX.Element {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const publish = usePublishWebsite();
  const canPublish = hasPermission('academy.website.publish');

  const handlePublish = async () => {
    const confirmed = await confirm({
      titleKey: 'website:publish.confirmTitle',
      descriptionKey: 'website:publish.confirmDescription',
      confirmLabelKey: 'website:publish.confirmAction',
    });
    if (!confirmed) return;
    publish.mutate(academyId);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <StatusBadge labelKey={`website:publish.status.${status}`} tone={STATUS_TONE[status]} />
        <span className="text-sm text-muted-foreground">
          {status === 'draft'
            ? t('website:publish.draftHint')
            : status === 'published'
              ? t('website:publish.publishedHint')
              : null}
        </span>
      </div>
      {canPublish ? (
        <Button type="button" onClick={handlePublish} disabled={publish.isPending || status === 'publishing'}>
          {publish.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CloudUpload className="size-4" strokeWidth={2} aria-hidden />
          )}
          {t('website:publish.action')}
        </Button>
      ) : null}
      {publish.error ? <ErrorState onRetry={handlePublish} className="w-full" /> : null}
    </div>
  );
}
