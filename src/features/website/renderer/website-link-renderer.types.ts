/**
 * The renderer-agnostic seam between a resolved CTA target and real
 * navigation (Prompt 11). A dashboard preview context supplies none of
 * this — its CTA buttons stay inert, exactly as before Prompt 11. The
 * public runtime supplies a real implementation using react-router's
 * `Link` for internal paths and a plain `<a>` for external URLs (see
 * `PublicWebsiteRouter`). Kept as a small, explicit prop rather than a
 * context, so `WebsiteRenderer` stays a pure, fully-controlled component
 * with no ambient navigation dependency.
 */
import type { ReactNode } from 'react';

export interface WebsiteLinkRendererProps {
  readonly href: string;
  readonly external: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export type WebsiteLinkRenderer = (props: WebsiteLinkRendererProps) => JSX.Element;
