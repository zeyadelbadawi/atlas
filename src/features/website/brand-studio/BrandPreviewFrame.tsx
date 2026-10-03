/**
 * The Brand Studio's live preview: the REAL website renderer (header,
 * sections, footer) at a reduced scale, with the draft palette applied —
 * never a mock-up. The Brand tab passes the Academy's own home page; the
 * setup form, which runs before any Academy exists, passes the sample
 * page from `brand-preview-sample.ts`.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** The largest scale; a narrower frame scales the canvas down to fit. */
  readonly scale?: number;
  /** The frame's height at `scale`; it shrinks in proportion with the scale. */
  readonly height?: number;
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * The frame's own width, kept current. A fixed scale clipped the preview on
 * a phone: 1280 px × 0.4 is 512 px, wider than the 310 px a 390 px screen
 * leaves for it, so only the left half of the page showed. The canvas now
 * scales down to the width it actually has.
 */
function useFrameWidth(): [React.RefObject<HTMLDivElement>, number | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const next = element.clientWidth;
      setWidth(next > 0 ? next : null);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
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
  const [frameRef, frameWidth] = useFrameWidth();
  const fittedScale =
    frameWidth === null ? scale : Math.min(scale, frameWidth / canvasWidth);
  const fittedHeight = Math.round((height * fittedScale) / scale);
  return (
    <div
      ref={frameRef}
      data-testid="brand-preview-frame"
      data-scale={fittedScale.toFixed(4)}
      className="relative w-full overflow-hidden bg-muted"
      style={{ height: fittedHeight }}
      // A picture of the site, not a second copy of its controls: hidden
      // from assistive tech and unreachable by keyboard (`inert`, which
      // React 18's types don't know yet).
      aria-hidden
      {...{ inert: '' }}
    >
      <div
        className="pointer-events-none origin-top-left rtl:origin-top-right"
        style={{
          width: canvasWidth,
          transform: `scale(${fittedScale})`,
        }}
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
