import type { ResponsiveVisibility } from '@types';
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import { cn } from '@utils';

/**
 * B0-WEB-11 — the Page Composer's per-breakpoint toggles were stored but
 * never applied, so a section "hidden on mobile" showed everywhere.
 *
 * The tiers match the editor's preview widths (`PreviewViewport`: mobile
 * 390 / tablet 768 / desktop 1440) against Tailwind's `md` (768) and `lg`
 * (1024): mobile is below `md`, tablet is `md` up to `lg`, desktop is `lg`
 * and up. Media queries, not JavaScript, so SSR output is already right
 * and nothing shifts on hydration; the editor preview's iframes evaluate
 * them at the device width. The class names are literal so Tailwind's
 * scanner emits them.
 */
const HIDDEN_AT: Record<keyof ResponsiveVisibility, string> = {
  mobile: 'max-md:hidden',
  tablet: 'md:max-lg:hidden',
  desktop: 'lg:hidden',
};

export function sectionVisibilityClass(
  visibility: ResponsiveVisibility | undefined
): string | null {
  const resolved = visibility ?? DEFAULT_RESPONSIVE_VISIBILITY;
  const hidden = (
    Object.keys(HIDDEN_AT) as (keyof ResponsiveVisibility)[]
  ).filter((tier) => resolved[tier] === false);
  if (hidden.length === 0) return null;
  return cn('contents', ...hidden.map((tier) => HIDDEN_AT[tier]));
}
