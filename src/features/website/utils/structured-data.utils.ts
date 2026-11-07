/**
 * Structured data (JSON-LD) builders (Prompt 10; SEO/AEO/GEO pass, Nov 2026).
 *
 * Pure functions that turn real, typed Atlas data into plain schema.org
 * fragments — never hand-authored strings, never raw HTML, never
 * `dangerouslySetInnerHTML`. The public runtime serializes them into
 * `<script type="application/ld+json">` (`useDocumentSeo`, server-rendered
 * by `renderSeoHeadHtml`); the Website SEO tab shows the Organization one
 * as a read-only preview.
 *
 * Rules every builder follows (Google Search Central structured-data
 * guidelines): the markup describes only what the page itself shows; URLs
 * are absolute (the caller passes the canonical origin); a value the
 * Academy has not set is omitted, never invented. Course info and FAQ rich
 * results are no longer shown by Google (removed Sep 2025 / May 2026), but
 * the schema.org vocabulary stays the machine-readable summary other search
 * and answer engines read; Course list (ItemList + Course) still is a Google
 * feature.
 */
import type {
  Academy,
  AcademyAddress,
  ArticleJsonLd,
  BlogPost,
  BreadcrumbJsonLd,
  Course,
  CourseJsonLd,
  FaqPageJsonLd,
  ItemListJsonLd,
  OrganizationJsonLd,
  PostalAddressJsonLd,
  SeoBreadcrumbItem,
  WebSiteJsonLd,
} from '@types';

/** `<origin>/#organization` — the Academy's node id, shared by every page. */
export function organizationJsonLdId(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/#organization`;
}

/** `<origin>/#website` */
export function webSiteJsonLdId(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/#website`;
}

/** Only absolute http(s) URLs: a `data:` image or a relative path is not a URL a crawler can fetch. */
function absoluteHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : undefined;
}

function postalAddress(
  address: AcademyAddress | undefined
): PostalAddressJsonLd | undefined {
  if (!address?.country) return undefined;
  return {
    '@type': 'PostalAddress',
    streetAddress: address.street || undefined,
    addressLocality: address.city || undefined,
    addressRegion: address.state || undefined,
    postalCode: address.postalCode || undefined,
    addressCountry: address.country,
  };
}

export interface OrganizationJsonLdInput extends Pick<
  Academy,
  'name' | 'description' | 'logo' | 'contactEmail' | 'contactPhone'
> {
  /** The canonical origin (`https://<canonical host>`): adds `@id` and `url`. */
  readonly origin?: string;
  readonly address?: AcademyAddress;
  /** The Academy's own profiles elsewhere (the footer's social links). */
  readonly sameAs?: readonly string[];
}

/**
 * Accepts a structural SUBSET of `Academy` (not the full type) so the
 * public runtime — which has the hostname resolution and the public
 * identity, never a full authenticated `Academy` fetch — can call this
 * without a second request. Every existing `Academy`-typed call site
 * (e.g. `WebsiteSeoTab`) keeps working, since a full `Academy`
 * structurally satisfies this narrower shape.
 */
export function buildOrganizationJsonLd(
  academy: OrganizationJsonLdInput
): OrganizationJsonLd {
  const origin = academy.origin?.replace(/\/+$/, '');
  const logo = absoluteHttpUrl(academy.logo);
  const sameAs = (academy.sameAs ?? []).filter((url) => !!absoluteHttpUrl(url));
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': origin ? organizationJsonLdId(origin) : undefined,
    name: academy.name,
    url: origin ? `${origin}/` : undefined,
    description: academy.description || undefined,
    logo,
    image: logo,
    email: academy.contactEmail || undefined,
    telephone: academy.contactPhone || undefined,
    address: postalAddress(academy.address),
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

/** The site's name for search results (Google site names: on the home page, `name` + canonical home `url`). */
export function buildWebSiteJsonLd(input: {
  readonly name: string;
  readonly origin: string;
  readonly languages: readonly string[];
}): WebSiteJsonLd {
  const origin = input.origin.replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': webSiteJsonLdId(origin),
    name: input.name,
    url: `${origin}/`,
    inLanguage: input.languages,
    publisher: { '@id': organizationJsonLdId(origin) },
  };
}

/** ISO 8601 duration (`PT3H20M`) for a number of seconds; `undefined` when unknown or zero. */
export function isoDuration(
  seconds: number | null | undefined
): string | undefined {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return undefined;
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}`;
}

export interface CourseJsonLdOptions {
  /** The course's canonical URL (absolute). */
  readonly url?: string;
  /** The canonical origin, for the provider's `@id`/`url`. */
  readonly origin?: string;
}

export function buildCourseJsonLd(
  course: Course,
  academy: Pick<Academy, 'name'>,
  options: CourseJsonLdOptions = {}
): CourseJsonLd {
  const origin = options.origin?.replace(/\/+$/, '');
  const url = options.url;
  const image = absoluteHttpUrl(course.thumbnail);
  const instructors = course.instructors
    .filter((instructor) => !!instructor.name)
    .map((instructor) => ({
      '@type': 'Person' as const,
      name: instructor.name,
      image: absoluteHttpUrl(instructor.avatar),
    }));
  const paid = course.pricing.type === 'paid';
  const offer =
    url && (!paid || (course.pricing.amount != null && course.pricing.currency))
      ? {
          '@type': 'Offer' as const,
          category: paid ? ('Paid' as const) : ('Free' as const),
          price: paid ? (course.pricing.amount ?? 0) : 0,
          priceCurrency: paid ? course.pricing.currency : undefined,
          url,
          availability: 'https://schema.org/InStock' as const,
        }
      : undefined;
  const totalReviews = course.stats?.totalReviews ?? 0;
  const averageRating = course.stats?.averageRating ?? 0;
  const outcomes = (course.outcomes ?? []).filter(Boolean);
  const requirements = (course.requirements ?? []).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': url ? `${url}#course` : undefined,
    name: course.title,
    description: course.shortDescription || course.description || undefined,
    url,
    image,
    inLanguage: course.language || undefined,
    educationalLevel: course.level || undefined,
    teaches: outcomes.length ? outcomes : undefined,
    coursePrerequisites: requirements.length ? requirements : undefined,
    provider: {
      '@type': 'EducationalOrganization',
      '@id': origin ? organizationJsonLdId(origin) : undefined,
      name: academy.name,
      url: origin ? `${origin}/` : undefined,
    },
    offers: offer ? [offer] : undefined,
    hasCourseInstance: [
      {
        '@type': 'CourseInstance',
        courseMode: 'Online',
        courseWorkload: isoDuration(course.stats?.durationSeconds),
        instructor: instructors.length ? instructors : undefined,
      },
    ],
    // Only approved reviews, and only when there are some: the course
    // page shows this same average and count.
    aggregateRating:
      totalReviews > 0 && averageRating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            reviewCount: totalReviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

/** The course catalog as a list of course pages (Google "Course list": every item a unique course URL). */
export function buildCourseListJsonLd(
  courses: ReadonlyArray<{ readonly url: string; readonly name: string }>
): ItemListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: courses.map((course, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: course.url,
      name: course.name,
    })),
  };
}

/** The FAQs page's visible questions and answers; blank ones are left out. */
export function buildFaqPageJsonLd(
  items: ReadonlyArray<{ readonly question: string; readonly answer: string }>
): FaqPageJsonLd | undefined {
  const entries = items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer);
  if (entries.length === 0) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function buildArticleJsonLd(post: BlogPost): ArticleJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    author: post.authorName
      ? { '@type': 'Person', name: post.authorName }
      : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
  };
}

/** `items[].path` is an absolute URL here (the public runtime passes canonical URLs). */
export function buildBreadcrumbJsonLd(
  items: readonly SeoBreadcrumbItem[]
): BreadcrumbJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path,
    })),
  };
}
