/**
 * Academy Brand Scope (dashboard branding).
 *
 * Scopes an Academy's own brand colors — the same `WebsiteConfiguration.
 * brand` HSL triplets `WebsiteThemeScope` (public website) already applies
 * — as CSS custom properties for a small, deliberately curated set of
 * dashboard surfaces. Never touches Atlas's own `--primary`/`--sidebar-*`
 * design tokens, which stay exactly as they are — the dashboard's own
 * look/personality is not replaced, only accented, matching
 * `WebsiteThemeScope`'s own "never bleed into the surrounding chrome"
 * discipline in the opposite direction (an Academy's brand accenting the
 * dashboard, never the dashboard's tokens leaking into the public site).
 *
 * `display: contents` — this wrapper must be transparent to the flex/grid
 * layout of whatever it's placed inside (e.g. `DashboardSidebar`'s
 * `<aside class="flex flex-col">`); only the CSS custom properties it
 * declares are meant to have any effect, never its own box. CSS custom
 * properties inherit through the DOM regardless of `display`, so this is
 * layout-neutral.
 *
 * A no-op wrapper when no color is supplied (no vars set, so every
 * `var(--academy-brand-*, <fallback>)` consumer falls through to its own
 * fallback) — this is what keeps the platform-level dashboard (no active
 * Academy) and any Academy that hasn't customized its branding rendering
 * exactly as before.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';

export interface AcademyBrandScopeProps {
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly accentColor?: string;
  readonly children: ReactNode;
}

export function AcademyBrandScope({
  primaryColor,
  secondaryColor,
  accentColor,
  children,
}: AcademyBrandScopeProps): JSX.Element {
  const style = useMemo<CSSProperties>(() => {
    const vars: Record<string, string> = {};
    if (primaryColor) {
      vars['--academy-brand-primary-solid'] = `hsl(${primaryColor})`;
      vars['--academy-brand-primary-surface'] = `hsl(${primaryColor} / 0.12)`;
    }
    if (secondaryColor) {
      vars['--academy-brand-secondary-solid'] = `hsl(${secondaryColor})`;
    }
    if (accentColor) {
      vars['--academy-brand-accent-solid'] = `hsl(${accentColor})`;
    }
    return vars as CSSProperties;
  }, [primaryColor, secondaryColor, accentColor]);

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}
