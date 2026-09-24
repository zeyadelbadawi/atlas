/**
 * Learner dashboard feature — public entry point.
 *
 * The one learner surface (AD-12): `/my/*` on the academy's own website.
 * Everything a consumer outside this feature needs is here, because the
 * lint rules forbid reaching into a feature's internals — and because the
 * surface only has one legitimate consumer, the academy website router that
 * mounts `LearnerRouter`.
 *
 * `LearnerProgressBar` and `LearnerSectionPlaceholder` are exported beyond
 * that for the data-bound work that fills these sections: the accessible
 * progress bar and the live-region content slot are the two pieces §E.6
 * requires every section to use, and they are only reusable if they are
 * reachable.
 */
export { LearnerRouter } from './LearnerRouter';
export type { LearnerRouterProps } from './LearnerRouter';

export { LearnerPageHeader } from './components/LearnerPageHeader';
export type { LearnerPageHeaderProps } from './components/LearnerPageHeader';
export { LearnerProgressBar } from './components/LearnerProgressBar';
export type { LearnerProgressBarProps } from './components/LearnerProgressBar';
/*
 * Exported beside the bar rather than hidden behind it: the two share one
 * ARIA contract and a learner hears both on the same screen, so a
 * consumer reaching for a progress indicator must be able to find either
 * without being tempted to draw a ring of their own.
 */
export { LearnerProgressRing } from './components/LearnerProgressRing';
export type { LearnerProgressRingProps } from './components/LearnerProgressRing';
export { LearnerSectionPlaceholder } from './components/LearnerSectionPlaceholder';
export type { LearnerSectionPlaceholderProps } from './components/LearnerSectionPlaceholder';

export { useLearnerSurface } from './context/LearnerSurface.context';
export type { LearnerSurface } from './context/LearnerSurface.context';

export {
  LEARNER_NAVIGATION,
  LEARNER_BOTTOM_NAVIGATION,
  learnerSection,
} from './constants/learner-navigation.constants';
export type {
  LearnerNavigationItem,
  LearnerSectionId,
} from './constants/learner-navigation.constants';

/*
 * P64 Phase 4 — the public course preview.
 *
 * The marketing Course Details page now offers the free sample lesson,
 * which the server already served to anonymous visitors. That makes the
 * website renderer a second legitimate consumer of two pieces that were
 * previously internal: the grant hook, which is the single place that
 * knows how a credential expires and how a refusal is classified, and the
 * YouTube source, which builds its frame from a server-vetted video id
 * rather than a raw URL. Exporting them is what stops the preview growing
 * a second, weaker copy of either rule.
 */
export { useLessonGrant } from './hooks/useLessonGrant';
export { YouTubeLessonPlayer } from './components/YouTubeLessonPlayer';
export type { YouTubeLessonPlayerProps } from './components/YouTubeLessonPlayer';
