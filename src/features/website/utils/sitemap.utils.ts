/**
 * Sitemap contract builder (Prompt 10).
 *
 * Produces the entries a future public runtime's `sitemap.xml` would
 * contain — a pure, read-only preview, never an actually-served file
 * (see `Reports/ARCHITECTURE.md`, Prompt 10, "Robots / Sitemap
 * Contracts"). Only PUBLISHED, VISIBLE, INDEXABLE content is included —
 * a draft page or an unpublished course must never appear here, the same
 * "draft is never public" boundary the whole prompt enforces.
 */
import type { BlogPost, Course, SitemapEntry, WebsiteConfiguration, WebsitePage } from '@types';

export interface BuildSitemapEntriesInput {
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
  readonly courses?: readonly Course[];
  readonly blogPosts?: readonly BlogPost[];
}

export function buildSitemapEntries({
  configuration,
  pages,
  courses = [],
  blogPosts = [],
}: BuildSitemapEntriesInput): readonly SitemapEntry[] {
  // The website itself must be published, and sitemap generation must be
  // explicitly enabled, before anything is listed.
  if (configuration.status !== 'published' || configuration.seo.sitemapEnabled === false) {
    return [];
  }

  const pageEntries: SitemapEntry[] = pages
    .filter((page) => page.visible && page.seo.indexable !== false)
    .map((page) => ({
      path: page.seo.canonicalPath || `/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: page.coreType === 'home' ? 'weekly' : 'monthly',
      priority: page.coreType === 'home' ? 1 : 0.6,
    }));

  const courseEntries: SitemapEntry[] = courses
    .filter((course) => course.status === 'published' && course.visibility === 'public')
    .map((course) => ({
      path: `/courses/${course.slug}`,
      lastModified: course.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const blogEntries: SitemapEntry[] = blogPosts
    .filter((post) => post.status === 'published')
    .map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

  return [...pageEntries, ...courseEntries, ...blogEntries];
}
