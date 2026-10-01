/**
 * Course Categories Section (Theme 1 plan §C.1 #3) — the Academy's real
 * categories, live from `GET public/websites/:academyId/categories` (only
 * categories holding a published public course), each linking to the
 * catalog filtered by it.
 *
 * Hidden on the public site with fewer than `MIN_COURSE_CATEGORIES`: two
 * tiles are not "exploring by category". The dashboard preview (no
 * `linkRenderer`) shows why instead of an unexplained gap.
 */
import { useTranslation } from 'react-i18next';
import { Shapes } from 'lucide-react';
import { usePublicCourseCategories } from '@hooks';
import { MIN_COURSE_CATEGORIES } from '../constants/website.constants';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { CourseCategoriesSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface CourseCategoriesSectionProps {
  readonly config: CourseCategoriesSectionConfig;
  readonly academyId: string;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function CourseCategoriesSection({
  config,
  academyId,
  pages,
  linkRenderer,
}: CourseCategoriesSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const { data, isLoading } = usePublicCourseCategories(academyId);
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  const categories = (data ?? []).slice(0, config.maxItems);
  if (isLoading) return null;
  if (categories.length < MIN_COURSE_CATEGORIES) {
    if (linkRenderer) return null;
    return (
      <section className={`${container} ${section}`}>
        <p className="rounded-[var(--website-radius)] border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          {t('website:renderer.courseCategories.previewHidden', {
            count: MIN_COURSE_CATEGORIES,
          })}
        </p>
      </section>
    );
  }

  return (
    <section className={`${container} ${section}`}>
      {(title || description) && (
        <div className="mb-10 space-y-2 text-center">
          {title ? (
            <h2 className={`${heading} text-3xl text-foreground`}>{title}</h2>
          ) : null}
          {description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      )}
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
        {categories.map((category) => {
          const body = (
            <>
              <Shapes
                className="size-6 text-[var(--website-primary-solid)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span
                className="mt-3 block break-words font-medium text-foreground"
                dir="auto"
              >
                {category.name}
              </span>
              {config.showCounts ? (
                <span className="mt-1 block text-sm text-muted-foreground">
                  {t('website:renderer.courseCategories.courseCount', {
                    count: category.courseCount,
                  })}
                </span>
              ) : null}
            </>
          );
          const href = linkRenderer
            ? resolveCatalogHref(pages, { category: category.id })
            : undefined;
          return (
            <li key={category.id}>
              {href ? (
                linkRenderer!({
                  href,
                  external: false,
                  className: `${cardClass} block h-full`,
                  children: body,
                })
              ) : (
                <div className={`${cardClass} h-full`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
