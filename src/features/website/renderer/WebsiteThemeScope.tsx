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
import { useMemo } from 'react';
import type { ResolvedWebsiteDesignSystem, WebsiteBrandConfig, WebsiteThemeDefinition } from '@types';
import { cn } from '@utils';
import { WebsiteDesignSystemContext } from './WebsiteDesignSystemContext';
import {
  WEBSITE_CONTAINER_WIDTH_VALUES,
  WEBSITE_RADIUS_VALUES,
  WEBSITE_SECTION_PADDING_VALUES,
  WEBSITE_SHADOW_VALUES,
} from '../utils/website-theme-tokens.utils';

export interface WebsiteThemeScopeProps {
  readonly theme: WebsiteThemeDefinition;
  readonly brand?: Pick<WebsiteBrandConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'>;
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

  const style = useMemo<CSSProperties>(
    () =>
      ({
        '--website-primary': resolved.primary,
        '--website-primary-solid': `hsl(${resolved.primary})`,
        '--website-primary-muted': `hsl(${resolved.primary} / 0.3)`,
        '--website-primary-surface': `hsl(${resolved.primary} / 0.08)`,
        '--website-secondary': resolved.secondary,
        '--website-secondary-solid': `hsl(${resolved.secondary})`,
        '--website-accent': resolved.accent,
        '--website-accent-solid': `hsl(${resolved.accent})`,
        '--website-radius': WEBSITE_RADIUS_VALUES[resolved.radius],
        '--website-shadow': WEBSITE_SHADOW_VALUES[resolved.shadow],
        '--website-section-padding': WEBSITE_SECTION_PADDING_VALUES[resolved.spacing],
        '--website-container-width': WEBSITE_CONTAINER_WIDTH_VALUES[resolved.containerWidth],
      }) as CSSProperties,
    [resolved]
  );

  return (
    <WebsiteDesignSystemContext.Provider value={resolved}>
      <div className={cn('website-theme-scope', className)} style={style}>
        {children}
      </div>
    </WebsiteDesignSystemContext.Provider>
  );
}
