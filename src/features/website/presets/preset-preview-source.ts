/**
 * What the presets' and templates' previews are drawn with — the Academy's
 * site as the editor previews it — and what presets are built against.
 */
import type { WebsiteConfiguration, WebsitePage } from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import type { PresetBuildContext } from './section-presets.types';

/** What a preview is drawn with: the Academy's site as the editor previews it. */
export interface PresetPreviewSource {
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: Pick<
    WebsiteConfiguration,
    'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'
  >;
  /** The Academy's pages: buttons resolve against them. */
  readonly pages: readonly WebsitePage[];
  /** The language the editor previews the site in. */
  readonly locale: PublicWebsiteLocale;
}

/** What presets are built against, for a preview source. */
export function presetContextOf(
  source: Pick<PresetPreviewSource, 'configuration' | 'pages'>
): PresetBuildContext {
  return {
    themeKey: getWebsiteTheme(source.configuration.themeKey).key,
    pages: source.pages,
  };
}
