/**
 * The region a learner section's real content will occupy.
 *
 * Phase 2 §E.1 builds the shell and the routes; the data each section binds
 * arrives separately. Rather than leave the pages blank — which reads as a
 * broken page rather than an unfinished one — each renders this, so the URL
 * is real, the navigation is real, the breadcrumb is real, and the content
 * region says honestly that there is nothing to show yet.
 *
 * The live region is the point of the component rather than decoration on
 * it (§E.6, "live regions for async state"). When the data-bound content
 * replaces the placeholder inside this wrapper, a screen reader hears the
 * change; a section that swaps its own children without one announces
 * nothing at all, and the learner is left listening to a page that has
 * silently finished loading. `status`, not `alert`: content arriving is
 * information, never an interruption.
 */
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@components/feedback';

export interface LearnerSectionPlaceholderProps {
  /** Translation key acknowledging the empty region. */
  readonly titleKey: string;
  /** Translation key explaining what will appear here. */
  readonly descriptionKey: string;
  readonly icon?: LucideIcon;
}

export function LearnerSectionPlaceholder({
  titleKey,
  descriptionKey,
  icon,
}: LearnerSectionPlaceholderProps): JSX.Element {
  return (
    <div role="status" aria-live="polite">
      <EmptyState
        titleKey={titleKey}
        descriptionKey={descriptionKey}
        icon={icon}
      />
    </div>
  );
}
