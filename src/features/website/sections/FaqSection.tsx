/**
 * FAQ Section.
 *
 * Reuses Atlas's existing accessible `Accordion` primitive — never a
 * hand-rolled disclosure widget. Renders TWO sources of FAQ content,
 * additively and in this fixed order: the Academy's reusable FAQ library
 * entries (Prompt 10, resolved by `useFaqLibraryEntries`) come first, followed by the page's own inline `items` (Prompt 9, now also
 * `LocalizedText` — Phase 6). A page saved before Prompt 10 has no
 * `libraryEntryIds`, so it renders exactly as it always has.
 *
 * Both sources resolve through the REAL public-website locale
 * (`usePublicWebsiteLocale`), not the dashboard chrome's own
 * `i18n.language` — see `PublicWebsiteLocaleContext`'s own doc comment.
 */
import { FaqDisclosureList } from '../primitives/FaqDisclosureList';
import { Button } from '@/components/ui/button';
import { useFaqLibraryEntries } from '../hooks';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import type { FaqSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface FaqSectionProps {
  readonly config: FaqSectionConfig;
  readonly academyId: string;
  readonly pages?: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function FaqSection({
  config,
  academyId,
  pages = [],
  linkRenderer,
}: FaqSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();

  // Server-resolved on the public site; the preview resolves them itself.
  const libraryItems = useFaqLibraryEntries(
    config,
    academyId,
    !linkRenderer
  ).map((entry) => ({
    id: entry.id,
    question: resolveLocalizedText(entry.question, locale),
    answer: resolveLocalizedText(entry.answer, locale),
  }));

  const inlineItems = config.items.map((item) => ({
    id: item.id,
    question: resolveLocalizedText(item.question, locale),
    answer: resolveLocalizedText(item.answer, locale),
  }));

  // Theme 1 plan §D.2 — `maxItems` makes the section a teaser (absent: all).
  const allItems = [...libraryItems, ...inlineItems].slice(
    0,
    config.maxItems ?? undefined
  );
  const title = resolveLocalizedText(config.title, locale);
  const ctaLabel = config.cta
    ? resolveLocalizedText(config.cta.label, locale)
    : '';
  const ctaHref = linkRenderer
    ? resolveWebsiteCtaHref(config.cta, pages, locale)
    : undefined;

  return (
    <section className={`${container} ${section}`}>
      {title ? (
        <h2 className={`${heading} mb-8 text-center text-3xl text-foreground`}>
          {title}
        </h2>
      ) : null}
      {/* Every answer is in the page's HTML (hidden until opened), so
          search and answer engines read it — Radix's accordion left it out. */}
      <FaqDisclosureList
        className="mx-auto max-w-2xl"
        triggerClassName="text-start"
        items={allItems}
      />
      {config.cta && ctaLabel ? (
        <div className="mt-8 flex justify-center">
          {ctaHref ? (
            <Button variant="outline" asChild>
              {linkRenderer!({
                href: ctaHref,
                external: isExternalHref(ctaHref),
                children: ctaLabel,
              })}
            </Button>
          ) : (
            <Button variant="outline">{ctaLabel}</Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
