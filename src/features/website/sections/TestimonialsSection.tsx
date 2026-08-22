/**
 * Testimonials Section.
 *
 * Renders library entries (Prompt 10, `WebsiteTestimonialEntry`,
 * resolved live) additively alongside the page's own inline `items`
 * (Prompt 9, unchanged) — same order/backward-compatibility contract as
 * `FaqSection`.
 */
import { useTranslation } from 'react-i18next';
import { Quote } from 'lucide-react';
import { useWebsiteTestimonialEntries } from '../hooks';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import type { LanguageCode, TestimonialsSectionConfig } from '@types';

export interface TestimonialsSectionProps {
  readonly config: TestimonialsSectionConfig;
  readonly academyId: string;
}

export function TestimonialsSection({ config, academyId }: TestimonialsSectionProps): JSX.Element {
  const { i18n } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const language = i18n.language as LanguageCode;

  const libraryEntryIds = config.libraryEntryIds ?? [];
  const { data } = useWebsiteTestimonialEntries(academyId, {
    query: { filters: { status: 'published' } },
    enabled: libraryEntryIds.length > 0,
  });

  const libraryItems = libraryEntryIds
    .map((id) => data?.items.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry && entry.visible)
    .map((entry) => ({
      id: entry.id,
      quote: entry.quote[language] || entry.quote.en,
      authorName: entry.authorName,
      authorRole: entry.authorRole ? entry.authorRole[language] || entry.authorRole.en : undefined,
      avatar: entry.avatar,
      // Library entries have no dedicated `avatarAlt` field (Prompt 10) — the author's own name is a reasonable, honest alt for a portrait photo.
      avatarAlt: entry.authorName,
    }));

  const allItems = [...libraryItems, ...config.items];

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-10 text-center text-3xl text-foreground`}>{config.title}</h2>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allItems.map((item) => (
          <figure key={item.id} className={cardClass}>
            <Quote className="size-5 text-[var(--website-primary-solid)]" aria-hidden />
            <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.avatarAlt ?? item.authorName}
                  className="size-9 rounded-full object-cover"
                />
              ) : null}
              <div>
                <p className="text-sm font-medium text-foreground">{item.authorName}</p>
                {item.authorRole ? (
                  <p className="text-xs text-muted-foreground">{item.authorRole}</p>
                ) : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
