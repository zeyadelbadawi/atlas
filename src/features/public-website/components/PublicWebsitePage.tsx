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
import { useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '@components/feedback';
import {
  WebsiteRenderer,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildCourseJsonLd,
  resolvePagePath,
  resolvePageSeo,
  resolveCourseSeo,
  resolveLocalizedText,
} from '@features/website';
import { useDocumentSeo } from '../hooks/useDocumentSeo';
import { usePublicCourse } from '../hooks/usePublicCourse';
import { resolvePathToPage } from '../utils/page-resolution.utils';
import { useAuth, useSignOut } from '@hooks';
import { usePublicWebsiteLinkRenderer, usePublicWebsiteHrefBuilder } from '../utils/public-website-link-renderer';
import type { PublicWebsiteDataState } from '../hooks/usePublicWebsiteData';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsitePageProps {
  readonly data: Extract<PublicWebsiteDataState, { status: 'ready' }>;
  /** Derived by `PublicWebsiteRouter` from the `/ar/...` URL prefix — see `locale.constants.ts`. */
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsitePage({ data, locale }: PublicWebsitePageProps): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const { session } = useAuth();
  const { signOut } = useSignOut();
  const { academy, configuration, pages } = data;

  // `useLocation().pathname` is the full, un-nested-away path — still
  // carrying the `/ar` prefix `PublicWebsiteRouter` matched on, even
  // though pages are stored/matched by their one canonical, unprefixed
  // slug path. Strip it before matching, re-apply it (via `buildHref`)
  // wherever a path is turned back into a real link/URL below.
  const unprefixedPathname =
    locale === 'en' ? location.pathname : location.pathname.replace(/^\/ar/, '') || '/';
  const withLocale = (path: string): string => (locale === 'en' ? path : `/ar${path}`);

  const authState =
    session.status === 'authenticated' && session.user
      ? {
          name: session.user.name,
          onSignOut: () => void signOut(),
          // Bare path — `WebsiteHeader` hands this straight to `linkRenderer`,
          // which now applies the locale prefix itself; pre-applying it here
          // too would double it (`/ar/ar/my-learning`).
          myLearningHref: '/my-learning',
        }
      : undefined;

  const { page, courseId } = resolvePathToPage(unprefixedPathname, pages);

  // The Course Details page renders a specific Course (`CourseDetailsTemplate`)
  // rather than CMS sections, so its SEO must reflect THAT course —
  // `resolveCourseSeo`, not the page's own generic `resolvePageSeo` — the
  // same real, PUBLIC-SAFE course data `CourseDetailsTemplate` itself
  // fetches (`usePublicCourse`, same query key, so TanStack Query
  // de-dupes it — not a second network request). Previously called the
  // tenant-scoped `useCourse` (`@features/course`) — masked by that same
  // de-dupe for as long as `CourseDetailsTemplate` used the identical
  // call, but a real, reproduced 401 the moment that template was fixed
  // to use the public endpoint and this one wasn't: found live during
  // this pass's own browser validation (a real visitor got a silent
  // background 401 + "session expired" toast on every course details
  // page view, despite the page itself rendering correctly).
  const isCourseDetailsPage = page?.coreType === 'courseDetails' && !!courseId;
  const { data: course } = usePublicCourse(academy.academyId, isCourseDetailsPage ? courseId : undefined);

  const fallback = { title: academy.academyName, description: academy.academyName };
  const seo =
    isCourseDetailsPage && course
      ? resolveCourseSeo(course, configuration, fallback, locale)
      : page
        ? resolvePageSeo(page, configuration, fallback, locale)
        : {
            title: fallback.title,
            description: fallback.description,
            ogTitle: fallback.title,
            ogDescription: fallback.description,
            indexable: false,
            titleSource: 'fallback' as const,
            descriptionSource: 'fallback' as const,
            locale,
            hreflangAlternates: [],
          };

  const pagePath =
    isCourseDetailsPage && course
      ? (seo.canonicalPath ?? unprefixedPathname)
      : page
        ? resolvePagePath(page) ?? unprefixedPathname
        : unprefixedPathname;
  // Self-referencing canonical: the CURRENT locale's own URL, matching
  // standard hreflang practice — `seo.hreflangAlternates` is what points
  // at the OTHER locale's URL, this one always points at itself.
  const canonicalUrl = `${window.location.origin}${withLocale(pagePath)}`;

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
    siteTitle: resolveLocalizedText(configuration.seo.siteTitle, locale),
    canonicalUrl,
    structuredData,
    locale,
  });

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <EmptyState
          titleKey="website:public.pageNotFound.title"
          descriptionKey="website:public.pageNotFound.description"
          primaryAction={{ labelKey: 'website:public.pageNotFound.homeAction', onAction: () => navigate(withLocale('/')) }}
        />
      </div>
    );
  }

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) navigate(withLocale(path));
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
          locale={locale}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
          // Switches locale on the ACTUAL current route (`unprefixedPathname`),
          // never `pagePath` — `pagePath` is the SEO-canonical path (a
          // real, pre-existing, deliberate divergence for Course Details:
          // `seo.canonicalPath` is slug-based, e.g. `/courses/yoga`, for
          // search engines, while the actual route only ever resolves a
          // COURSE ID, e.g. `/courses/405cc388-...` —
          // `resolvePathToPage`'s course-details matcher has no slug
          // lookup at all). Using `pagePath` here reproduced live as a
          // real "Unexpected error" the moment a visitor switched locale
          // from a Course Details page: the slug-based canonical path
          // isn't a resolvable route. `unprefixedPathname` is always the
          // literal path the visitor is actually looking at, so switching
          // locale can never land anywhere it didn't already know how to
          // render.
          onLocaleChange={(targetLocale) =>
            navigate(
              `${targetLocale === 'en' ? unprefixedPathname : `/ar${unprefixedPathname}`}${location.search}`
            )
          }
          authState={authState}
        />
      </div>
    </>
  );
}
