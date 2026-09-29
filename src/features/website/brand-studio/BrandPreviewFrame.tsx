/**
 * The Brand Studio's live preview: the REAL website renderer (header,
 * sections, footer) at a reduced scale, with the draft palette applied —
 * never a mock-up. The Brand tab passes the Academy's own home page; the
 * setup form, which runs before any Academy exists, passes the sample
 * page from `brand-preview-sample.ts`.
 */
import { WebsiteRenderer } from '../renderer';
import type { BrandPalette } from '../brand-engine';
import type {
  WebsiteConfiguration,
  WebsitePage,
  WebsiteThemeKey,
} from '@types';

export interface BrandPreviewFrameProps {
  readonly palette: BrandPalette;
  readonly themeKey: WebsiteThemeKey;
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: Pick<
    WebsiteConfiguration,
    'brand' | 'navigation' | 'header' | 'footer'
  >;
  readonly pages: readonly WebsitePage[];
  readonly page: WebsitePage;
  /** Rendered width of the page canvas before scaling. */
  readonly canvasWidth?: number;
  readonly scale?: number;
  readonly height?: number;
}

export function BrandPreviewFrame({
  palette,
  themeKey,
  academyId,
  academyName,
  academyLogo,
  configuration,
  pages,
  page,
  canvasWidth = 1280,
  scale = 0.45,
  height = 520,
}: BrandPreviewFrameProps): JSX.Element {
  return (
    <div
      className="relative w-full overflow-hidden bg-muted"
      style={{ height }}
      // A picture of the site, not a second copy of its controls: hidden
      // from assistive tech and unreachable by keyboard (`inert`, which
      // React 18's types don't know yet).
      aria-hidden
      {...{ inert: '' }}
    >
      <div
        className="pointer-events-none origin-top-left rtl:origin-top-right"
        style={{ width: canvasWidth, transform: `scale(${scale})` }}
      >
        <WebsiteRenderer
          academyId={academyId}
          academyName={academyName}
          academyLogo={academyLogo}
          configuration={{
            ...configuration,
            themeKey,
            // Legacy colours = the seeds, as the backend stores them.
            brand: {
              ...configuration.brand,
              primaryColor: palette.seeds.primary,
              secondaryColor: palette.seeds.secondary ?? palette.seeds.primary,
              accentColor: palette.seeds.accent ?? palette.seeds.primary,
              palette: palette as unknown as Record<string, unknown>,
            },
          }}
          pages={pages}
          page={page}
          onNavigate={() => undefined}
        />
      </div>
    </div>
  );
}
