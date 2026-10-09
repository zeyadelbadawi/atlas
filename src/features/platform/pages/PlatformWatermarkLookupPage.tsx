/**
 * Platform Watermark Lookup Page — `/dashboard/platform/watermarks`
 * (docs/FORENSIC_WATERMARK.md, "Platform Owner lookup").
 *
 * Every course video carries a per-viewer code drawn over the picture.
 * When a screen recording leaks, the Platform Owner reads the code off the
 * recording and enters it here to see who it was issued to, for which
 * content, and on which session, device and network.
 *
 * THE URL IS THE SUBMITTED CODE. `?code=` holds the last code looked up
 * (in its display form), so a result can be shared with another operator
 * by link, Back returns to the previous code, and the "other codes in this
 * session" table links straight to `?code=…`. The field is a draft until
 * submitted.
 *
 * NOTHING INVALID IS SENT. The draft is normalised and checked on every
 * keystroke with the same rule as the server (`normalizeWatermarkCode`);
 * only a code with a matching check symbol becomes a request. A deep link
 * carrying a malformed code shows the problem and sends nothing.
 *
 * Every lookup the server answers is audited (`platform.watermark.looked_up`)
 * — the page says so. The response is personal data: the query is never
 * persisted and leaves the cache when the page stops showing it.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SkeletonCard } from '@components/loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { usePlatformWatermarkLookup } from '../hooks/usePlatformWatermarkLookup';
import { WatermarkCodeForm } from '../components/WatermarkCodeForm';
import { WatermarkLookupIdle } from '../components/WatermarkLookupIdle';
import { WatermarkLookupResult } from '../components/WatermarkLookupResult';
import {
  formatWatermarkCode,
  normalizeWatermarkCode,
} from '../utils/watermark-code.utils';
import {
  WATERMARK_FAILURE_COPY,
  watermarkLookupFailure,
} from '../utils/watermark-lookup.utils';

const K = 'platform:watermarkLookup';
const CODE_PARAM = 'code';

function LookupSkeleton(): JSX.Element {
  return (
    <div className="space-y-4" aria-hidden data-testid="watermark-loading">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function PlatformWatermarkLookupPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCode = searchParams.get(CODE_PARAM) ?? '';
  const submitted = useMemo(() => normalizeWatermarkCode(urlCode), [urlCode]);
  const activeCode = submitted.ok ? submitted.code : null;

  const [draft, setDraft] = useState(urlCode);
  // A related-code link, Back/Forward or a pasted URL changes the code:
  // the field follows it.
  useEffect(() => {
    setDraft(urlCode);
  }, [urlCode]);

  const lookup = usePlatformWatermarkLookup(activeCode);

  const setUrlCode = (code: string | null) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (code) next.set(CODE_PARAM, code);
      else next.delete(CODE_PARAM);
      return next;
    });
  };

  const handleSubmit = (code: string) => {
    if (code === activeCode) {
      // Same code again: an explicit, audited re-check.
      void lookup.refetch();
      return;
    }
    setUrlCode(formatWatermarkCode(code));
  };

  const handleClear = () => {
    setDraft('');
    if (urlCode) setUrlCode(null);
  };

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    { labelKey: `${K}.title` },
  ];

  const displayCode = activeCode ? formatWatermarkCode(activeCode) : '';

  const renderBody = (): JSX.Element => {
    if (!activeCode) return <WatermarkLookupIdle />;

    if (lookup.error) {
      const copy = WATERMARK_FAILURE_COPY[watermarkLookupFailure(lookup.error)];
      return (
        <ErrorState
          titleKey={copy.titleKey}
          descriptionKey={copy.descriptionKey}
          requestId={lookup.error.requestId}
          onRetry={copy.retryable ? () => void lookup.refetch() : undefined}
          className="py-12"
        />
      );
    }

    if (!lookup.data) return <LookupSkeleton />;

    return <WatermarkLookupResult data={lookup.data} />;
  };

  const status = (() => {
    if (!activeCode || lookup.error) return '';
    if (lookup.isFetching) return t(`${K}.loading`, { code: displayCode });
    if (lookup.data) return t(`${K}.found`, { code: lookup.data.code });
    return '';
  })();

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}.title`}
        descriptionKey={`${K}.subtitle`}
        breadcrumbs={breadcrumbs}
      />

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <WatermarkCodeForm
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            onClear={handleClear}
            isSubmitting={lookup.isFetching}
            showProblems={urlCode !== '' && draft === urlCode && !submitted.ok}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClipboardList className="size-3.5 shrink-0" aria-hidden />
            {t(`${K}.auditNotice`)}
          </p>
        </CardContent>
      </Card>

      <section
        aria-label={t(`${K}.title`)}
        aria-busy={lookup.isFetching || undefined}
      >
        <p
          role="status"
          aria-live="polite"
          className="sr-only"
          data-testid="watermark-lookup-status"
        >
          {status}
        </p>
        {renderBody()}
      </section>
    </PageContainer>
  );
}
