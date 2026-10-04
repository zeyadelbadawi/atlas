/**
 * The setup form's per-theme live preview (Theme 2 plan §5, WS-O): the
 * Brand Studio's mini-preview (`BrandPreviewFrame` + the sample Home from
 * `brand-preview-sample.ts`) rendered in ONE named theme, so the theme
 * picker shows each theme as the real site it builds — never a swatch or a
 * screenshot. The colours are the Owner's "Logo & colours" choice when they
 * made one, otherwise that theme's own defaults.
 */
import { memo, useMemo } from 'react';
import type { WebsiteThemeKey } from '@types';
import { buildBrandPalette } from '../brand-engine';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BrandPreviewFrame } from './BrandPreviewFrame';
import { brandPreviewSample } from './brand-preview-sample';
import type { SetupBrandingChoice } from './SetupBrandStudio';
import { buildDraftPalette, draftFromPalette } from './useBrandStudio';

export interface SetupThemePreviewProps {
  readonly themeKey: WebsiteThemeKey;
  readonly academyName: string;
  /** The palette chosen in "Logo & colours"; absent → the theme's defaults. */
  readonly palette?: SetupBrandingChoice['palette'];
  /** An object URL of the logo picked in "Logo & colours". */
  readonly academyLogo?: string;
  /** Which side of the sample's bilingual text to show. */
  readonly locale?: PublicWebsiteLocale;
  /** The largest scale; a narrower frame scales the page down to fit. */
  readonly scale?: number;
  /** The frame's height at `scale`. */
  readonly height?: number;
}

export const SetupThemePreview = memo(function SetupThemePreview({
  themeKey,
  academyName,
  palette,
  academyLogo,
  locale,
  scale = 0.32,
  height = 360,
}: SetupThemePreviewProps): JSX.Element {
  const sample = useMemo(() => brandPreviewSample(academyName), [academyName]);
  const brandPalette = useMemo(
    () =>
      palette
        ? buildBrandPalette(palette)
        : buildDraftPalette(
            draftFromPalette(undefined, getWebsiteTheme(themeKey))
          ),
    [palette, themeKey]
  );
  return (
    <BrandPreviewFrame
      palette={brandPalette}
      themeKey={themeKey}
      academyId=""
      academyName={academyName}
      academyLogo={academyLogo}
      locale={locale}
      configuration={sample.configuration}
      pages={[sample.page]}
      page={sample.page}
      scale={scale}
      height={height}
    />
  );
});
