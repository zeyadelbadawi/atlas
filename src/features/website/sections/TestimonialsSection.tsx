/**
 * Testimonials Section.
 *
 * Renders library entries (Prompt 10, resolved by
 * `useTestimonialLibraryEntries`) additively alongside the page's own inline `items`
 * (Prompt 9, now also `LocalizedText` — Phase 6) — same order/backward-
 * compatibility contract as `FaqSection`. Both sources are normalized to
 * the same plain-string shape up front via `resolveLocalizedText`, using
 * the REAL public-website locale (`usePublicWebsiteLocale`) — no longer
 * the dashboard chrome's own `i18n.language`, which has nothing to do
 * with which language a public visitor is looking at (see
 * `PublicWebsiteLocaleContext`'s own doc comment).
 */
import { useTranslation } from 'react-i18next';
import { Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@components/data-display';
import { useTestimonialLibraryEntries } from '../hooks';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { ThemeImage, hasRenderableImage } from '../theme-assets';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { TestimonialsSectionConfig } from '@types';

export interface TestimonialsSectionProps {
  readonly config: TestimonialsSectionConfig;
  readonly academyId: string;
  /**
   * Theme 1 plan §D.4 — the public runtime. Sample (starter) testimonials
   * are never shown there (the API already strips them; this is the second
   * guard); previews show them labelled "Sample".
   */
  readonly isPublic?: boolean;
}

export function TestimonialsSection({
  config,
  academyId,
  isPublic = false,
}: TestimonialsSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();

  // Server-resolved on the public site; the preview resolves them itself.
  const libraryItems = useTestimonialLibraryEntries(
    config,
    academyId,
    !isPublic
  ).map((entry) => ({
    id: entry.id,
    quote: resolveLocalizedText(entry.quote, locale),
    authorName: entry.authorName,
    authorRole: entry.authorRole
      ? resolveLocalizedText(entry.authorRole, locale)
      : undefined,
    avatar: entry.avatar,
    // Library entries have no dedicated `avatarAlt` field (Prompt 10) — the author's own name is a reasonable, honest alt for a portrait photo.
    avatarAlt: entry.authorName,
    rating: undefined as number | undefined,
    sample: false,
  }));

  const inlineItems = config.items
    .filter((item) => !(isPublic && item.sample))
    .map((item) => ({
      id: item.id,
      quote: resolveLocalizedText(item.quote, locale),
      authorName: item.authorName,
      authorRole: item.authorRole
        ? resolveLocalizedText(item.authorRole, locale)
        : undefined,
      avatar: item.avatar,
      avatarAlt:
        resolveLocalizedText(item.avatarAlt, locale) || item.authorName,
      rating: item.rating,
      sample: item.sample === true,
    }));

  const allItems = [...libraryItems, ...inlineItems];
  const title = resolveLocalizedText(config.title, locale);

  return (
    <section className={`${container} ${section}`}>
      {title ? (
        <h2 className={`${heading} mb-10 text-center text-3xl text-foreground`}>
          {title}
        </h2>
      ) : null}
      {/* `auto-fit`/`minmax`, not fixed `sm:grid-cols-2 lg:grid-cols-3` — see
          `FeaturedCoursesSection`'s identical comment for why. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-6">
        {allItems.map((item) => (
          <figure key={item.id} className={cardClass}>
            {item.sample ? (
              <Badge variant="outline" className="mb-2">
                {t('website:renderer.testimonials.sampleBadge')}
              </Badge>
            ) : null}
            <Quote
              className="size-5 text-[var(--website-primary-solid)]"
              aria-hidden
            />
            {item.rating ? (
              <StarRating
                value={item.rating}
                size="sm"
                className="mt-2"
                label={t('website:renderer.courseDetails.ratingLabel', {
                  rating: item.rating,
                })}
              />
            ) : null}
            <blockquote className="mt-3 break-words text-sm leading-relaxed text-foreground">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              {hasRenderableImage(item.avatar) ? (
                <ThemeImage
                  value={item.avatar}
                  sizes="36px"
                  alt={item.avatarAlt ?? item.authorName}
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div className="min-w-0">
                {/* `dir="auto"` — `authorName` is a plain, single-language
                    string (never `LocalizedText`); see
                    `FeaturedCoursesSection`'s identical comment. */}
                <p
                  className="truncate text-sm font-medium text-foreground"
                  dir="auto"
                >
                  {item.authorName}
                </p>
                {item.authorRole ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.authorRole}
                  </p>
                ) : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
