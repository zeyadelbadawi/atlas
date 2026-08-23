/**
 * Public Website Page (Prompt 11).
 *
 * The public runtime's real page surface — resolves the current path to
 * a published `WebsitePage`, computes its SEO via the EXACT SAME
 * `resolvePageSeo` hierarchy the dashboard's SEO tab documents (Page
 * Override → Website Global → Atlas System Fallback), and renders
 * through the EXACT SAME `WebsiteRenderer` the dashboard preview uses —
 * never a second renderer (see `Reports/ARCHITECTURE.md`, Prompt 11,
 * "One Renderer, Every Surface, Including Public").
 *
 * `linkRenderer` here is the one place CTA buttons become real
 * navigation: internal targets use react-router's `Link` (client-side,
 * no full reload), external targets use a plain `<a target="_blank">`.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '@components/feedback';
import {
  WebsiteRenderer,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildCourseJsonLd,
  resolvePagePath,
  resolvePageSeo,
  resolveCourseSeo,
} from '@features/website';
import type { WebsiteLinkRenderer } from '@features/website';
import { useCourse } from '@features/course';
import { useDocumentSeo } from '../hooks/useDocumentSeo';
import { resolvePathToPage } from '../utils/page-resolution.utils';
import type { PublicWebsiteDataState } from '../hooks/usePublicWebsiteData';

const linkRenderer: WebsiteLinkRenderer = ({ href, external, className, children }) =>
  external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link to={href} className={className}>
      {children}
    </Link>
  );

export interface PublicWebsitePageProps {
  readonly data: Extract<PublicWebsiteDataState, { status: 'ready' }>;
}

export function PublicWebsitePage({ data }: PublicWebsitePageProps): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { academy, configuration, pages } = data;

  const { page, courseId } = resolvePathToPage(location.pathname, pages);

  // The Course Details page renders a specific Course (`CourseDetailsTemplate`,
  // via `@features/course`) rather than CMS sections, so its SEO must reflect
  // THAT course — `resolveCourseSeo`, not the page's own generic
  // `resolvePageSeo` — the same real Course data `CourseDetailsTemplate`
  // fetches (TanStack Query de-duplicates the identical query, so this is
  // not a second network request).
  const isCourseDetailsPage = page?.coreType === 'courseDetails' && !!courseId;
  const { data: course } = useCourse(academy.academyId, courseId ?? '', {
    enabled: isCourseDetailsPage,
  });

  const fallback = { title: academy.academyName, description: academy.academyName };
  const seo =
    isCourseDetailsPage && course
      ? resolveCourseSeo(course, configuration, fallback)
      : page
        ? resolvePageSeo(page, configuration, fallback)
        : {
            title: fallback.title,
            description: fallback.description,
            ogTitle: fallback.title,
            ogDescription: fallback.description,
            indexable: false,
            titleSource: 'fallback' as const,
            descriptionSource: 'fallback' as const,
          };

  const pagePath =
    isCourseDetailsPage && course
      ? (seo.canonicalPath ?? location.pathname)
      : page
        ? resolvePagePath(page) ?? location.pathname
        : location.pathname;
  const canonicalUrl = `${window.location.origin}${pagePath}`;

  const structuredData = page
    ? [
        buildOrganizationJsonLd({ name: academy.academyName, logo: academy.academyLogo }),
        buildBreadcrumbJsonLd([
          { name: academy.academyName, path: window.location.origin },
          { name: isCourseDetailsPage && course ? course.title : page.title, path: canonicalUrl },
        ]),
        ...(isCourseDetailsPage && course
          ? [buildCourseJsonLd(course, { name: academy.academyName })]
          : []),
      ]
    : undefined;

  useDocumentSeo({
    seo,
    siteTitle: configuration.seo.siteTitle,
    canonicalUrl,
    structuredData,
  });

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <EmptyState
          titleKey="website:public.pageNotFound.title"
          descriptionKey="website:public.pageNotFound.description"
          primaryAction={{ labelKey: 'website:public.pageNotFound.homeAction', onAction: () => navigate('/') }}
        />
      </div>
    );
  }

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) navigate(path);
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        {t('navigation:skipToContent')}
      </a>
      <div id="main-content">
        <WebsiteRenderer
          academyId={academy.academyId}
          academyName={academy.academyName}
          academyLogo={academy.academyLogo}
          configuration={configuration}
          pages={pages}
          page={page}
          previewCourseId={courseId}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
        />
      </div>
    </>
  );
}
