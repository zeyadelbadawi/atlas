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
import type {
  ResolvedWebsiteDesignSystem,
  WebsiteBrandConfig,
  WebsiteThemeDefinition,
} from '@types';
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

  const style = useMemo<CSSProperties>(
    () =>
      ({
        /**
         * THE PUBLIC SITE OWNS ITS OWN PAGE COLOURS.
         *
         * These used to come from Atlas's `bg-background`/`text-foreground`
         * dashboard tokens, which caused two real problems. First, that
         * palette deliberately tints every neutral toward the ATLAS brand
         * hue ("Pure white and pure black are never used" — `index.css`),
         * so every academy website inherited a blue-green cast that had
         * nothing to do with that academy's own branding. Second, the
         * tokens flip with the dashboard's `.dark` class, so an admin who
         * preferred dark mode previewed — and, on shared surfaces, showed
         * visitors — a dark version of a site whose owner never chose one.
         *
         * A customer's public website is white because that is what its
         * design calls for, not because of anything the Atlas dashboard
         * happens to be set to.
         */
        '--website-background': '#ffffff',
        '--website-foreground': 'hsl(222 22% 12%)',
        /** A neutral separation surface — never a brand wash. */
        '--website-surface': 'hsl(210 20% 97%)',
        '--website-border': 'hsl(214 20% 91%)',

        '--website-primary': resolved.primary,
        '--website-primary-solid': `hsl(${resolved.primary})`,
        '--website-primary-muted': `hsl(${resolved.primary} / 0.3)`,
        /**
         * An 8% wash of the academy's brand colour. Correct for SMALL,
         * deliberately branded elements — image placeholders, avatar
         * fallbacks, icon tiles. It is NOT a page background: applied to a
         * full-width band it turns a whole screen the brand colour, which
         * is exactly how the hero ended up reading as a green page rather
         * than a white page with green accents.
         */
        '--website-primary-surface': `hsl(${resolved.primary} / 0.08)`,
        '--website-secondary': resolved.secondary,
        '--website-secondary-solid': `hsl(${resolved.secondary})`,
        '--website-accent': resolved.accent,
        '--website-accent-solid': `hsl(${resolved.accent})`,
        '--website-radius': WEBSITE_RADIUS_VALUES[resolved.radius],
        '--website-shadow': WEBSITE_SHADOW_VALUES[resolved.shadow],
        '--website-section-padding':
          WEBSITE_SECTION_PADDING_VALUES[resolved.spacing],
        '--website-container-width':
          WEBSITE_CONTAINER_WIDTH_VALUES[resolved.containerWidth],
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
