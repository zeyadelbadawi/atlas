/**
 * Sample social proof (Theme 1 plan §D.4): the list of sections that still
 * hold sample testimonials — one row per section, naming the page, the
 * section and how many samples it holds, with a "Review" link straight to
 * that section in the Page Editor. Shared by the publish warning and the
 * overview's launch checklist, so both always say the same thing.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MessageSquareQuote } from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { SECTION_METADATA } from '../sections';
import type { SampleContentEntry, SectionType } from '@types';

export function sampleReviewPath(
  academyId: string,
  entry: Pick<SampleContentEntry, 'pageId' | 'sectionId'>
): string {
  const page = buildPath(DASHBOARD_ROUTES.websitePageEditor, {
    academyId,
    pageId: entry.pageId,
  });
  return `${page}?section=${encodeURIComponent(entry.sectionId)}`;
}

export function SampleContentList({
  academyId,
  entries,
  onNavigate,
}: {
  readonly academyId: string;
  readonly entries: readonly SampleContentEntry[];
  /** Called before following a "Review" link (e.g. to close a dialog). */
  readonly onNavigate?: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {entries.map((entry) => {
        const metadata = SECTION_METADATA[entry.sectionType as SectionType];
        return (
          <li
            key={entry.sectionId}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MessageSquareQuote
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.pageTitle}
                  <span className="text-muted-foreground">
                    {' · '}
                    {metadata ? t(metadata.labelKey) : entry.sectionType}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('website:sampleContent.count', {
                    count: entry.sampleItems,
                  })}
                </p>
              </div>
            </div>
            <Link
              to={sampleReviewPath(academyId, entry)}
              onClick={onNavigate}
              className="inline-flex min-h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('website:sampleContent.reviewLabel', {
                page: entry.pageTitle,
              })}
            >
              {t('website:sampleContent.review')}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
