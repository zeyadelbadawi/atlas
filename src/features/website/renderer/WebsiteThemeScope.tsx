/**
 * Website Theme Scope.
 *
 * Combines a `WebsiteThemeDefinition`'s tokens with the Tenant's brand
 * color overrides into one `ResolvedWebsiteDesignSystem`, provides it
 * through `WebsiteDesignSystemContext`, AND applies the color/radius/
 * shadow/spacing/container tokens as CSS custom properties scoped to this
 * wrapper only (`--website-*`, never Atlas's own `--primary`/`--radius`
 * dashboard tokens) — switching a website's theme can never bleed into
 * the Atlas dashboard chrome around it, and vice versa.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type {
  ResolvedWebsiteDesignSystem,
  WebsiteBrandConfig,
  WebsiteThemeDefinition,
} from '@types';
import { cn } from '@utils';
import { PortalContainerProvider } from '@/components/ui/portal-container';
import { WebsiteDesignSystemContext } from './WebsiteDesignSystemContext';
import {
  WEBSITE_CONTAINER_WIDTH_VALUES,
  WEBSITE_RADIUS_VALUES,
  WEBSITE_SECTION_PADDING_VALUES,
  WEBSITE_SHADOW_VALUES,
} from '../utils/website-theme-tokens.utils';
import { getThemePack } from '../theme-packs/theme-pack.registry';
import { ThemePackContext } from '../theme-packs/ThemePackContext';

export interface WebsiteThemeScopeProps {
  readonly theme: WebsiteThemeDefinition;
  readonly brand?: Pick<
    WebsiteBrandConfig,
    'primaryColor' | 'secondaryColor' | 'accentColor'
  >;
  readonly children: ReactNode;
  readonly className?: string;
}

export function WebsiteThemeScope({
  theme,
  brand,
  children,
  className,
}: WebsiteThemeScopeProps): JSX.Element {
  const resolved = useMemo<ResolvedWebsiteDesignSystem>(
    () => ({
      ...theme.tokens,
      primary: brand?.primaryColor || theme.tokens.defaultPrimary,
      secondary: brand?.secondaryColor || theme.tokens.defaultSecondary,
      accent: brand?.accentColor || theme.tokens.defaultAccent,
    }),
    [theme, brand]
  );

  const pack = useMemo(() => getThemePack(theme.key), [theme.key]);

  const style = useMemo<CSSProperties>(
    () =>
      ({
        // Colours: the theme pack's brand mapping (Theme 1 plan §F.5) —
        // see `base-brand-mapping.ts` for the variables and why each one
        // exists.
        ...pack.mapBrandPalette({
          theme,
          seeds: {
            primary: resolved.primary,
            secondary: resolved.secondary,
            accent: resolved.accent,
          },
        }),
        // Shape and rhythm: the theme's own bounded tokens.
        '--website-radius': WEBSITE_RADIUS_VALUES[resolved.radius],
        '--website-shadow': WEBSITE_SHADOW_VALUES[resolved.shadow],
        '--website-section-padding':
          WEBSITE_SECTION_PADDING_VALUES[resolved.spacing],
        '--website-container-width':
          WEBSITE_CONTAINER_WIDTH_VALUES[resolved.containerWidth],
      }) as CSSProperties,
    [pack, theme, resolved]
  );

  // Portalled overlays (dialogs, sheets, popovers, selects) mount HERE,
  // inside the scope, so they take the website's light tokens and the
  // academy's brand colour instead of the dashboard's theme at the root —
  // see `portal-container.tsx`. A callback ref, so the container exists
  // before anything can open into it.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  );

  return (
    <WebsiteDesignSystemContext.Provider value={resolved}>
      <ThemePackContext.Provider value={pack}>
        <div className={cn('website-theme-scope', className)} style={style}>
          <PortalContainerProvider value={portalContainer}>
            {children}
          </PortalContainerProvider>
          {/* `text-foreground` so text inside a portalled overlay inherits the
            scope's colour rather than the body's (dark-mode) colour. */}
          <div
            ref={setPortalContainer}
            data-website-portal-root
            className="text-foreground"
          />
        </div>
      </ThemePackContext.Provider>
    </WebsiteDesignSystemContext.Provider>
  );
}
