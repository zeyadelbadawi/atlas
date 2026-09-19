/**
 * Every learner page's title and breadcrumb trail, built from one place.
 *
 * Pages name the SECTION they are, not the trail they want: the trail is
 * derived from the same `LEARNER_NAVIGATION` declaration the side nav,
 * drawer and bottom bar read, so a section renamed once is renamed
 * everywhere. Hand-written trails are how "My Courses" in the sidebar ends
 * up as "Courses" in the breadcrumb on the same screen.
 *
 * Trails are built with real hrefs (`buildHref`), never bare paths — a
 * breadcrumb on `/ar/my/courses/abc` that links to `/my/courses` drops the
 * learner out of Arabic, and the shared `Breadcrumbs` component renders
 * `item.path` verbatim.
 *
 * On the Overview page the trail is one item long, and `Breadcrumbs`
 * deliberately renders nothing then: a single crumb repeats the `<h1>`
 * directly beneath it and tells the reader nothing about where they are.
 */
import type { ReactNode } from 'react';
import { PageHeader } from '@components/layout';
import type { BreadcrumbItem } from '@types';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import {
  learnerSection,
  type LearnerSectionId,
} from '../constants/learner-navigation.constants';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export interface LearnerPageHeaderProps {
  /** Which learner section this page belongs to. */
  readonly section: LearnerSectionId;
  /** Translation key for the page title. */
  readonly titleKey: string;
  /** Literal title, for a page titled by data rather than product copy. */
  readonly title?: string;
  readonly descriptionKey?: string;
  /**
   * A crumb after the section's own — the course on
   * `/my/courses/:courseId`. Never linked: it is the current page.
   */
  readonly trailing?: BreadcrumbItem;
  readonly actions?: ReactNode;
}

export function LearnerPageHeader({
  section,
  titleKey,
  title,
  descriptionKey,
  trailing,
  actions,
}: LearnerPageHeaderProps): JSX.Element {
  const { buildHref } = useLearnerSurface();
  const item = learnerSection(section);
  const isOverview = section === 'overview';

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'learning:learnerDashboard.nav.overview',
      // The root crumb is a link from everywhere except the root itself.
      ...(isOverview ? {} : { path: buildHref(LEARNER_ROUTES.root) }),
    },
    ...(isOverview || !item
      ? []
      : [
          {
            labelKey: item.labelKey,
            // Linked only when it is an ancestor rather than the page in
            // hand — a breadcrumb that links to the page you are on is a
            // dead control, and `aria-current="page"` already says so.
            ...(trailing ? { path: buildHref(item.path) } : {}),
          },
        ]),
    ...(trailing ? [trailing] : []),
  ];

  return (
    <PageHeader
      titleKey={titleKey}
      title={title}
      descriptionKey={descriptionKey}
      breadcrumbs={breadcrumbs}
      actions={actions}
    />
  );
}
