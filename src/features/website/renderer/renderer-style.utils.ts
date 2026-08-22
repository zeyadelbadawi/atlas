/**
 * Shared section styling helpers.
 *
 * Every section reads its className treatment through these — never a
 * component-local radius/shadow/card decision — so the "bounded design
 * tokens only" guarantee holds uniformly (see `Reports/ARCHITECTURE.md`,
 * Prompt 9, "Design System Safety").
 */
import { cn } from '@utils';
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';
import {
  WEBSITE_HEADING_TRACKING_CLASSES,
  WEBSITE_HEADING_WEIGHT_CLASSES,
  websiteHeadingCaseClass,
} from '../utils/website-theme-tokens.utils';

/** ClassName for a section/page heading — weight/tracking/case all theme-driven. */
export function useWebsiteHeadingClass(): string {
  const design = useWebsiteDesignSystem();
  return cn(
    'font-display',
    WEBSITE_HEADING_WEIGHT_CLASSES[design.headingWeight],
    WEBSITE_HEADING_TRACKING_CLASSES[design.headingTracking],
    websiteHeadingCaseClass(design.headingCase)
  );
}

/** ClassName for a card-shaped element (course card, feature card, testimonial), driven by `cardVariant`. */
export function useWebsiteCardClass(): string {
  const design = useWebsiteDesignSystem();
  const base = 'rounded-[var(--website-radius)] p-6 transition-shadow';

  switch (design.cardVariant) {
    case 'flat':
      return cn(base, 'border border-border/60 bg-card');
    case 'outlined':
      return cn(base, 'border-2 bg-card border-[var(--website-primary-muted)]');
    case 'bold':
      return cn(base, 'border-2 shadow-[var(--website-shadow)] bg-card border-[var(--website-primary-solid)]');
    case 'elevated':
    default:
      return cn(base, 'border border-border/40 shadow-[var(--website-shadow)] bg-card');
  }
}

/** ClassName for a page/section content container, width-bounded by `containerWidth`. */
export function useWebsiteContainerClass(): string {
  return 'mx-auto w-full max-w-[var(--website-container-width)] px-4 sm:px-6 lg:px-8';
}

/** ClassName for a section's vertical rhythm, driven by `spacing`. */
export function useWebsiteSectionClass(): string {
  return 'py-[var(--website-section-padding)]';
}
