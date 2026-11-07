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
  PUBLIC_WEBSITE_MAIN_ID,
  WebsiteNotFound,
  WebsiteRenderer,
  hasThemeNotFound,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildCourseJsonLd,
  buildCourseListJsonLd,
  buildFaqPageJsonLd,
  buildWebSiteJsonLd,
  collectPageFaqItems,
  composeSeoDescription,
  derivePageDescription,
  hslTripletToHex,
  localizedPublicPath,
  PUBLIC_WEBSITE_LOCALES,
  resolvePagePath,
  resolvePageSeo,
  resolveCourseSeo,
  resolveLocalizedText,
  publicPageName,
  publicWebsiteLocalePrefix,
  stripPublicWebsiteLocalePrefix,
  usePublicWebsiteDefaultLocale,
} from '@features/website';
import { useDocumentSeo } from '../hooks/useDocumentSeo';
import { composeDocumentTitle } from '../hooks/useAcademyDocumentTitle';
import { resolveCanonicalOrigin } from '../utils/canonical-redirect.utils';
import { useAcademyIdentity, usePublicCourse } from '@hooks';
import { useListedPublicCourses } from '../hooks/useListedPublicCourses';
import {
  absoluteImageUrl,
  academyIconHref,
  academyMonogramIconHref,
  academyOgImageUrl,
} from '../utils/academy-brand-images.utils';
import { resolvePathToPage } from '../utils/page-resolution.utils';
import { useAuth, useRequestLocation, useSignOut } from '@hooks';
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
import type { PublicWebsiteDataState } from '../hooks/usePublicWebsiteData';
import type { Course, PublicWebsiteLocale } from '@types';
import { LEARNER_ROUTES } from '@app/routes/route-paths';

export interface PublicWebsitePageProps {
  readonly data: Extract<PublicWebsiteDataState, { status: 'ready' }>;
  /** Derived by `PublicWebsiteRouter` from the URL prefix (`/ar/...`, or `/en/...` on an Arabic-default site) — see `locale.constants.ts`. */
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsitePage({
  data,
  locale,
}: PublicWebsitePageProps): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const requestLocation = useRequestLocation();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const { session } = useAuth();
  const { signOut } = useSignOut();
  const { academy, configuration, pages } = data;
  // B0-WEB-02 — the language this site serves unprefixed.
  const defaultLocale = usePublicWebsiteDefaultLocale();

  // `useLocation().pathname` is the full, un-nested-away path — still
  // carrying the `/ar` prefix `PublicWebsiteRouter` matched on, even
  // though pages are stored/matched by their one canonical, unprefixed
  // slug path. Strip it before matching, re-apply it (via `buildHref`)
  // wherever a path is turned back into a real link/URL below.
  const unprefixedPathname = stripPublicWebsiteLocalePrefix(
    location.pathname,
    locale,
    defaultLocale
  );
  const withLocale = (path: string): string =>
    `${publicWebsiteLocalePrefix(locale, defaultLocale)}${path}`;
  const switchLocale = (targetLocale: PublicWebsiteLocale) =>
    navigate(
      `${publicWebsiteLocalePrefix(targetLocale, defaultLocale)}${unprefixedPathname}${location.search}`
    );

  const authState =
    session.status === 'authenticated' && session.user
      ? {
          name: session.user.name,
          onSignOut: () => void signOut(),
          // Bare path — `WebsiteHeader` hands this straight to `linkRenderer`,
          // which now applies the locale prefix itself; pre-applying it here
          // too would double it (`/ar/ar/my`).
          myLearningHref: LEARNER_ROUTES.root,
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
  const { data: course } = usePublicCourse(
    academy.academyId,
    isCourseDetailsPage ? courseId : undefined
  );

  // B9 (UX audit) V10 — each page is titled by its own name in the
  // visitor's language ("Courses · Academy", `useDocumentSeo` adds the
  // site), never the academy's name alone on every page; Home keeps the
  // name alone. A page or course that isn't here says so.
  const pageName = page
    ? publicPageName(page, configuration.navigation, locale, t)
    : t('website:public.pageNotFound.title');
  // The Academy's public identity (description, contact, address) — the
  // same cached read the footer makes, so no extra request.
  const { data: identity } = useAcademyIdentity(academy.academyId);
  // SEO/AEO/GEO pass — with no meta description of the owner's own, a page
  // describes itself with its own opening sentence (hero / page header),
  // topped up with the Academy's description, never the bare name.
  const fallback = {
    title: pageName || academy.academyName,
    description: composeSeoDescription({
      pageText: page ? derivePageDescription(page, locale) : undefined,
      academyDescription: identity?.description,
      generic: t('website:public.seo.defaultDescription', {
        academyName: academy.academyName,
      }),
    }),
  };
  // A course that doesn't exist here (unknown, unpublished or not public —
  // the public endpoint's 404, returned as `null`) renders a "not found"
  // page, which search engines must not index.
  const isMissingCourse = isCourseDetailsPage && course === null;
  const notFound = !page || isMissingCourse;
  const resolvedSeo =
    isCourseDetailsPage && course
      ? resolveCourseSeo(course, configuration, fallback, locale, defaultLocale)
      : page && !isMissingCourse
        ? resolvePageSeo(page, configuration, fallback, locale, defaultLocale)
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
  // The Academy's name when no site title is configured: a page title
  // alone ("Home") never says whose site this is.
  const siteTitle =
    resolveLocalizedText(configuration.seo.siteTitle, locale) ||
    academy.academyName;
  const namedSeo =
    resolvedSeo.titleSource === 'fallback' &&
    resolvedSeo.ogTitle === resolvedSeo.title
      ? // A shared link names the site too, as the tab does.
        {
          ...resolvedSeo,
          ogTitle: composeDocumentTitle(resolvedSeo.title, siteTitle),
        }
      : resolvedSeo;
  const baseSeo = isMissingCourse
    ? {
        ...namedSeo,
        title: t('website:public.pageNotFound.title'),
        ogTitle: composeDocumentTitle(
          t('website:public.pageNotFound.title'),
          siteTitle
        ),
        indexable: false,
      }
    : namedSeo;

  const pagePath =
    isCourseDetailsPage && course
      ? (baseSeo.canonicalPath ?? unprefixedPathname)
      : page
        ? (resolvePagePath(page) ?? unprefixedPathname)
        : unprefixedPathname;
  // Self-referencing canonical: the CURRENT locale's own URL, matching
  // standard hreflang practice — `seo.hreflangAlternates` is what points
  // at the OTHER locale's URL, this one always points at itself.
  // P63 — the canonical origin is the Academy's canonical host (its
  // connected custom domain, otherwise its Atlas subdomain), so both
  // live hosts advertise the same single URL to search engines.
  const canonicalOrigin = resolveCanonicalOrigin(
    requestLocation.origin,
    academy.canonicalHost
  );
  const localizedUrl = (path: string): string =>
    `${canonicalOrigin}${localizedPublicPath(path, locale, defaultLocale)}`;
  // A core or custom page's canonical is its resolved `canonicalPath` (the
  // owner's override, else the page's own path), the same path its hreflang
  // alternates and x-default use; a course page keeps its slug path.
  const canonicalUrl = localizedUrl(
    isCourseDetailsPage ? pagePath : (baseSeo.canonicalPath ?? pagePath)
  );

  // Every page has a picture to share: the owner's, the course's, else the
  // Academy's generated card (absolute, on the canonical host).
  const seo = {
    ...baseSeo,
    ogImage:
      absoluteImageUrl(baseSeo.ogImage, canonicalOrigin) ??
      academyOgImageUrl(academy, canonicalOrigin),
  };

  const homePage = pages.find((candidate) => candidate.coreType === 'home');
  const coursesPage = pages.find(
    (candidate) => candidate.coreType === 'courses' && candidate.visible
  );
  const homeName = homePage
    ? publicPageName(homePage, configuration.navigation, locale, t) ||
      academy.academyName
    : academy.academyName;
  const isHome = page?.coreType === 'home';
  const listedCourses = useListedPublicCourses(
    academy.academyId,
    page?.coreType === 'courses'
  );
  const courseUrl = (listed: Course): string =>
    localizedUrl(`/courses/${encodeURIComponent(listed.slug || listed.id)}`);
  const organization = buildOrganizationJsonLd({
    name: academy.academyName,
    origin: canonicalOrigin,
    description: identity?.description,
    logo: absoluteImageUrl(
      identity?.logoUrl ?? academy.academyLogo,
      canonicalOrigin
    ),
    contactEmail: identity?.contactEmail,
    contactPhone: identity?.contactPhone,
    address: identity?.address,
    sameAs: (configuration.footer?.socialLinks ?? [])
      .map((link) => link.url ?? '')
      .filter(Boolean),
  });
  const breadcrumb = (trail: ReadonlyArray<{ name: string; url: string }>) =>
    buildBreadcrumbJsonLd([
      { name: homeName, path: localizedUrl('/') },
      ...trail.map((crumb) => ({ name: crumb.name, path: crumb.url })),
    ]);
  const faqPage =
    page?.coreType === 'faqs'
      ? buildFaqPageJsonLd(collectPageFaqItems(page, locale))
      : undefined;

  const structuredData = notFound
    ? undefined
    : isCourseDetailsPage && course
      ? [
          breadcrumb([
            ...(coursesPage
              ? [
                  {
                    name: publicPageName(
                      coursesPage,
                      configuration.navigation,
                      locale,
                      t
                    ),
                    url: localizedUrl('/courses'),
                  },
                ]
              : []),
            { name: course.title, url: canonicalUrl },
          ]),
          buildCourseJsonLd(
            course,
            { name: academy.academyName },
            { url: canonicalUrl, origin: canonicalOrigin }
          ),
        ]
      : isHome
        ? [
            organization,
            buildWebSiteJsonLd({
              name: siteTitle,
              origin: canonicalOrigin,
              languages: PUBLIC_WEBSITE_LOCALES,
            }),
          ]
        : [
            ...(page?.coreType === 'about' ? [organization] : []),
            breadcrumb([{ name: pageName, url: canonicalUrl }]),
            ...(page?.coreType === 'courses' && listedCourses.length > 0
              ? [
                  buildCourseListJsonLd(
                    listedCourses.map((listed) => ({
                      url: courseUrl(listed),
                      name: listed.title,
                    }))
                  ),
                ]
              : []),
            ...(faqPage ? [faqPage] : []),
          ];

  const primaryColor = configuration.brand?.primaryColor;
  useDocumentSeo({
    seo,
    siteTitle,
    siteName: siteTitle,
    canonicalUrl,
    structuredData,
    faviconHref: academyIconHref(academy),
    appleTouchIconHref: academyMonogramIconHref(academy, 180),
    themeColor: primaryColor ? hslTripletToHex(primaryColor) : undefined,
    // Search Console / Bing Webmaster Tools look for these on the home page.
    verification: isHome
      ? {
          google: configuration.seo.googleSiteVerification,
          bing: configuration.seo.bingSiteVerification,
        }
      : undefined,
    notFound,
    locale,
  });

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) navigate(withLocale(path));
  };

  // Theme 1 plan Phase 6 — a theme with its own "page not found" draws it
  // inside its chrome; every other theme keeps the shared screen below.
  if (!page && hasThemeNotFound(configuration.themeKey)) {
    return (
      <>
        <a
          href={`#${PUBLIC_WEBSITE_MAIN_ID}`}
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          {t('navigation:skipToContent')}
        </a>
        <WebsiteNotFound
          academyId={academy.academyId}
          academyName={academy.academyName}
          academyLogo={academy.academyLogo}
          configuration={configuration}
          pages={pages}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
          locale={locale}
          onLocaleChange={switchLocale}
          authState={authState}
        />
      </>
    );
  }

  if (!page) {
    return (
      // Outside `WebsiteRenderer`/`WebsiteChrome`, so the scope class is applied
      // here by hand — see `PublicWebsiteStatus` for why. `main` and an `h1`
      // give the page its landmark and top-level heading; same look.
      <main className="website-theme-scope flex min-h-screen items-center justify-center bg-background p-6">
        <EmptyState
          headingLevel="h1"
          titleKey="website:public.pageNotFound.title"
          descriptionKey="website:public.pageNotFound.description"
          primaryAction={{
            labelKey: 'website:public.pageNotFound.homeAction',
            onAction: () => navigate(withLocale('/')),
          }}
        />
      </main>
    );
  }

  return (
    <>
      <a
        href={`#${PUBLIC_WEBSITE_MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        {t('navigation:skipToContent')}
      </a>
      <WebsiteRenderer
        academyId={academy.academyId}
        academyName={academy.academyName}
        academyLogo={academy.academyLogo}
        configuration={configuration}
        pages={pages}
        page={page}
        // The course's own id once it has loaded: a course reached at its
        // slug URL (the canonical one search engines are sent to) enrols,
        // reviews and opens the learner area by id, exactly as one reached
        // at its id URL does.
        previewCourseId={course?.id ?? courseId}
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
        onLocaleChange={switchLocale}
        authState={authState}
      />
    </>
  );
}
