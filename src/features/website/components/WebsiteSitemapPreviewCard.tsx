/**
 * A read-only preview of the pages this website's served `sitemap.xml`
 * lists — see `buildSitemapEntries`'s doc comment. Built from the saved
 * pages, so an unpublished edit shows here before it reaches the live
 * file; the served file also lists the academy's public courses.
 *
 * Shown on Website settings ▸ SEO, beside the switches it depends on
 * (search engine indexing and the sitemap).
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildSitemapEntries } from '../utils/sitemap.utils';
import type { WebsiteConfiguration, WebsitePage } from '@types';

export function WebsiteSitemapPreviewCard({
  configuration,
  pages,
}: {
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const { t } = useTranslation();
  const entries = buildSitemapEntries({ configuration, pages });

  return (
    <Card data-testid="website-sitemap-preview">
      <CardHeader>
        <CardTitle className="text-base">
          {t('website:overview.sitemapPreview.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          {t('website:overview.sitemapPreview.help')}
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('website:overview.sitemapPreview.empty')}
          </p>
        ) : (
          <ul className="space-y-1 text-sm" dir="ltr" data-ltr-content>
            {entries.map((entry) => (
              <li
                key={entry.path}
                className="flex items-center justify-between gap-4 font-mono text-xs"
              >
                <span className="min-w-0 break-all text-foreground">
                  {entry.path}
                </span>
                <span className="text-muted-foreground">
                  {entry.priority.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
