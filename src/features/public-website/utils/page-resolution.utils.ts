/**
 * Public runtime path → `WebsitePage` resolution (Prompt 11).
 *
 * The inverse of `@features/website`'s `resolvePagePath` (page → path).
 * A hidden page (`visible: false`) resolves to nothing here — the public
 * runtime must never expose it, regardless of how its URL is guessed
 * (see `Reports/ARCHITECTURE.md`, Prompt 11, "Draft / Published Model").
 */
import type { WebsitePage } from '@types';

export interface ResolvedPathTarget {
  readonly page?: WebsitePage;
  /** Only set when the path matched `/courses/:courseId` — the id `CourseDetailsTemplate` should render. */
  readonly courseId?: string;
}

const COURSE_DETAILS_PATH = /^\/courses\/([^/]+)$/;

export function resolvePathToPage(
  pathname: string,
  pages: readonly WebsitePage[]
): ResolvedPathTarget {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  const courseMatch = normalized.match(COURSE_DETAILS_PATH);
  if (courseMatch) {
    const courseDetailsPage = pages.find((page) => page.coreType === 'courseDetails');
    return { page: courseDetailsPage, courseId: courseMatch[1] };
  }

  if (normalized === '/') {
    return { page: pages.find((page) => page.coreType === 'home' && page.visible) };
  }

  const segment = normalized.slice(1);
  const corePage = pages.find(
    (page) => page.coreType === segment && page.coreType !== 'courseDetails' && page.visible
  );
  if (corePage) return { page: corePage };

  const customPage = pages.find(
    (page) => page.pageType === 'custom' && page.slug === segment && page.visible
  );
  return { page: customPage };
}
