/**
 * The miniature previews of section presets and page templates: the REAL
 * section renderers of the website's active theme, never a picture.
 *
 * - `PresetSectionsCanvas` draws a list of sections the way the site does
 *   (theme pack, brand colours, the previewed language and direction, the
 *   theme's photographs, samples labelled "Sample"), without the header
 *   and footer: a preset is one section, so its preview is that section.
 * - `PresetMiniPreview` puts that canvas in the editor's device frame — an
 *   iframe of a real screen width (`IframeViewport`, the same frame as the
 *   page preview), so the theme lays out for that screen — and shrinks it
 *   with `transform: scale()` to the card's width. Its box keeps the
 *   screen's proportions from the first paint, so nothing moves when it
 *   fills in. It is a picture of the section for sighted authors: hidden
 *   from assistive tech and unreachable by keyboard (the card around it
 *   names and describes the preset).
 *
 * Dashboard-only: nothing here is part of the public site's bundles.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  SectionInstance,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import { cn } from '@utils';
import { IframeViewport } from '../components/PreviewViewport';
import { SectionRenderer } from '../sections/SectionRenderer';
import { PageHeadingProvider } from '../renderer/PageHeadingContext';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import { WebsiteIdentityProvider } from '../renderer/WebsiteIdentityContext';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { adoptThemeAssets } from '../theme-assets/adopt-theme-assets';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { PUBLIC_WEBSITE_LOCALE_DIRECTION } from '../constants/locale.constants';
import type { PresetPreviewSource } from './preset-preview-source';

/** The sections as the active theme draws them, without header and footer. */
export function PresetSectionsCanvas({
  source,
  sections,
}: {
  readonly source: PresetPreviewSource;
  readonly sections: readonly SectionInstance[];
}): JSX.Element {
  const theme = getWebsiteTheme(source.configuration.themeKey);
  const identity = useMemo(
    () => ({ name: source.academyName, logo: source.academyLogo }),
    [source.academyName, source.academyLogo]
  );
  // A photograph of another theme is drawn as this theme's, as on the site.
  const drawn = useMemo(
    () => adoptThemeAssets(sections, theme.key),
    [sections, theme.key]
  );
  return (
    <WebsiteIdentityProvider value={identity}>
      <PublicWebsiteLocaleProvider
        locale={source.locale}
        className="min-h-[100dvh]"
      >
        <WebsiteThemeScope
          theme={theme}
          brand={source.configuration.brand}
          className="min-h-[100dvh]"
        >
          <div className="min-h-[100dvh] bg-[var(--website-background)] text-[var(--website-foreground)]">
            {drawn.map((instance) => (
              <PageHeadingProvider key={instance.id} value="h2">
                <SectionRenderer
                  instance={instance}
                  academyId={source.academyId}
                  pages={source.pages}
                />
              </PageHeadingProvider>
            ))}
          </div>
        </WebsiteThemeScope>
      </PublicWebsiteLocaleProvider>
    </WebsiteIdentityProvider>
  );
}

/** The screens a miniature is laid out on: a laptop, or a phone when the dashboard itself is on one. */
const MINI_SCREENS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 560 },
} as const;

const PHONE_QUERY = '(max-width: 639px)';

function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(PHONE_QUERY).matches
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return isPhone;
}

/** The element's inner width, followed as it changes. */
function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => setWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export interface PresetMiniPreviewProps {
  readonly source: PresetPreviewSource;
  readonly sections: readonly SectionInstance[];
  /** Taller screens show more of a long page (templates). */
  readonly screen?: 'section' | 'page';
  readonly className?: string;
}

export function PresetMiniPreview({
  source,
  sections,
  screen = 'section',
  className,
}: PresetMiniPreviewProps): JSX.Element {
  const { t } = useTranslation();
  const isPhone = useIsPhone();
  const [ref, width] = useWidth();
  const device = MINI_SCREENS[isPhone ? 'mobile' : 'desktop'];
  const height =
    screen === 'page' ? Math.round(device.height * 1.5) : device.height;
  const scale = width > 0 ? width / device.width : 0;
  return (
    <div
      ref={ref}
      data-testid="preset-mini-preview"
      data-screen={isPhone ? 'mobile' : 'desktop'}
      className={cn(
        'relative w-full overflow-hidden rounded-md bg-muted ring-1 ring-border',
        className
      )}
      style={{ aspectRatio: `${device.width} / ${height}` }}
      aria-hidden
      // A picture, not a second copy of the site's controls (`inert`,
      // which React 18's types don't know yet).
      {...{ inert: '' }}
    >
      {/* Under the frame while it fills in; covered once it has. */}
      <div className="absolute inset-0 bg-muted motion-safe:animate-pulse" />
      {scale > 0 ? (
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <IframeViewport
            width={device.width}
            height={height}
            dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[source.locale]}
            lang={source.locale}
            title={t('website:preview.frameTitle')}
          >
            <PresetSectionsCanvas source={source} sections={sections} />
          </IframeViewport>
        </div>
      ) : null}
    </div>
  );
}
