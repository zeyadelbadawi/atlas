/**
 * Structured data (JSON-LD) builders (Prompt 10).
 *
 * Pure functions that turn real, typed Atlas data into plain schema.org
 * fragments — never hand-authored strings, never raw HTML, never
 * `dangerouslySetInnerHTML`. Nothing in this prompt injects these into
 * the DOM (there is no public runtime yet to crawl them); they are shown
 * as a read-only JSON preview in the Website SEO surface and are the
 * exact contract a future public runtime will serialize into a
 * `<script type="application/ld+json">` tag (see
 * `Reports/ARCHITECTURE.md`, Prompt 10, "Structured Data").
 *
 * `item`/URL-shaped fields below carry a site-relative PATH, not an
 * absolute URL — the same "no real domain" boundary every other
 * canonical-ish field in this prompt respects. A future public runtime
 * prefixes these with its real origin.
 */
import type {
  Academy,
  ArticleJsonLd,
  BlogPost,
  BreadcrumbJsonLd,
  Course,
  CourseJsonLd,
  OrganizationJsonLd,
  SeoBreadcrumbItem,
} from '@types';

export function buildOrganizationJsonLd(academy: Academy): OrganizationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: academy.name,
    description: academy.description,
    logo: academy.logo,
    email: academy.contactEmail,
    telephone: academy.contactPhone,
  };
}

export function buildCourseJsonLd(course: Course, academy: Academy): CourseJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.shortDescription || course.description,
    provider: { '@type': 'Organization', name: academy.name },
  };
}

export function buildArticleJsonLd(post: BlogPost): ArticleJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    author: post.authorName ? { '@type': 'Person', name: post.authorName } : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
  };
}

export function buildBreadcrumbJsonLd(items: readonly SeoBreadcrumbItem[]): BreadcrumbJsonLd {
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
