/**
 * Website Chrome (Phase 1, Extended Scope, dependency C).
 *
 * The Theme + Header + Footer shell `WebsiteRenderer` already builds,
 * extracted so a non-CMS public-runtime surface (Sign In, Sign Up — never
 * stored as a `WebsitePage` row, never editable through the Page
 * Composer) can render inside the exact same Academy-branded shell
 * instead of a second, invented one. `WebsiteRenderer` itself is
 * rewritten to use this component for its own Theme/Header/Footer
 * wiring, so there is still exactly one place that composition lives —
 * see this feature's own "One Renderer, Every Surface" doc comment,
 * which this split preserves rather than contradicts: the header/footer/
 * theme wiring is the part every surface must share; which BODY renders
 * in between (CMS sections, the Course Details template, or an auth
 * form) is the one axis that's allowed to differ.
 */
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteFooter } from './WebsiteFooter';
import type {
  WebsiteBrandConfig,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteChromeProps {
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: Pick<WebsiteConfiguration, 'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'>;
  readonly pages: readonly WebsitePage[];
  readonly activePageId?: string;
  readonly onNavigate: (pageId: string) => void;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
  readonly children: React.ReactNode;
}

export function WebsiteChrome({
  academyName,
  academyLogo,
  configuration,
  pages,
  activePageId,
  onNavigate,
  linkRenderer,
  className,
  children,
}: WebsiteChromeProps): JSX.Element {
  const theme = getWebsiteTheme(configuration.themeKey);
  const brand: Pick<WebsiteBrandConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'> =
    configuration.brand;

  return (
    <WebsiteThemeScope theme={theme} brand={brand} className={className}>
      <div className="min-h-full bg-background text-foreground">
        <WebsiteHeader
          logo={academyLogo}
          academyName={academyName}
          navigation={configuration.navigation}
          pages={pages}
          header={configuration.header}
          activePageId={activePageId}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
        />

        <main>{children}</main>

        <WebsiteFooter
          academyName={academyName}
          footer={configuration.footer}
          pages={pages}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
        />
      </div>
    </WebsiteThemeScope>
  );
}
