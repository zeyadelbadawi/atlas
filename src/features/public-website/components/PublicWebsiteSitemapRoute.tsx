/**
 * Public Website sitemap.xml Route (Prompt 11).
 *
 * Same honest boundary as `PublicWebsiteRobotsRoute` — see its doc
 * comment. `buildSitemapEntries` (Prompt 10, reused unchanged) already
 * excludes drafts/hidden/archived/unpublished content; this route only
 * formats the result via `generateSitemapXml`.
 */
import { buildSitemapEntries } from '@features/website';
import { generateSitemapXml } from '../utils/robots-sitemap.utils';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';

export interface PublicWebsiteSitemapRouteProps {
  readonly lookupKey: string;
}

export function PublicWebsiteSitemapRoute({ lookupKey }: PublicWebsiteSitemapRouteProps): JSX.Element {
  const data = usePublicWebsiteData(lookupKey);

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { configuration, pages } = data;
  const entries = buildSitemapEntries({ configuration, pages });
  const xml = generateSitemapXml(entries, window.location.origin);

  return (
    <pre className="min-h-screen whitespace-pre-wrap bg-background p-6 font-mono text-xs text-foreground">
      {xml}
    </pre>
  );
}
