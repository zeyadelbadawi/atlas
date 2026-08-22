/**
 * Public Website robots.txt Route (Prompt 11).
 *
 * Renders the exact text a future edge layer (a Cloudflare Worker,
 * per this prompt's own architecture) would serve verbatim at
 * `/robots.txt` with `Content-Type: text/plain`. A pure client-rendered
 * SPA cannot itself control the HTTP response's `Content-Type` for an
 * arbitrary path — Vite's dev server and every static host serve every
 * non-asset path as the SPA's `index.html` (`text/html`) — so this route
 * is the honest, correctly-generated CONTENT, not a claim that real
 * `text/plain` HTTP serving already works (see `Reports/ARCHITECTURE.md`,
 * Prompt 11, "Robots / Sitemap Serving Boundary"). The generation logic
 * itself (`generateRobotsTxt`) is exactly what that future edge layer
 * would call.
 */
import { generateRobotsTxt } from '../utils/robots-sitemap.utils';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';

export interface PublicWebsiteRobotsRouteProps {
  readonly lookupKey: string;
}

export function PublicWebsiteRobotsRoute({ lookupKey }: PublicWebsiteRobotsRouteProps): JSX.Element {
  const data = usePublicWebsiteData(lookupKey);

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { configuration } = data;
  const indexable = configuration.seo.robotsIndexable ?? true;
  const sitemapUrl =
    configuration.seo.sitemapEnabled !== false ? `${window.location.origin}/sitemap.xml` : undefined;

  return (
    <pre className="min-h-screen whitespace-pre-wrap bg-background p-6 font-mono text-sm text-foreground">
      {generateRobotsTxt(indexable, sitemapUrl)}
    </pre>
  );
}
