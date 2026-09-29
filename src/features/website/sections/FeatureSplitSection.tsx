/**
 * Feature Split Section (Theme 1 plan §C.1 #5) — an image beside a title,
 * lead and numbered benefits. `imagePosition` is logical: `start` is the
 * left in English and the right in Arabic, because the grid follows the
 * document direction.
 */
import { Button } from '@/components/ui/button';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { FeatureSplitSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface FeatureSplitSectionProps {
  readonly config: FeatureSplitSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function FeatureSplitSection({
  config,
  pages,
  linkRenderer,
}: FeatureSplitSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const description = resolveLocalizedText(config.description, locale);
  const ctaLabel = config.cta
    ? resolveLocalizedText(config.cta.label, locale)
    : '';
  const href = linkRenderer
    ? resolveWebsiteCtaHref(config.cta, pages)
    : undefined;

  return (
    <section className={`${container} ${section}`}>
      <div
        className={`grid items-center gap-10 ${config.image ? 'md:grid-cols-2' : ''}`}
      >
        {config.image ? (
          <img
            src={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            className={`aspect-[4/3] w-full object-cover ${config.imagePosition === 'end' ? 'md:order-last' : ''}`}
            style={{ borderRadius: 'var(--website-radius)' }}
          />
        ) : null}
        <div className="space-y-4">
          {eyebrow ? (
            <p className="text-sm font-medium text-[var(--website-primary-solid)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className={`${heading} break-words text-3xl text-foreground`}>
            {resolveLocalizedText(config.title, locale)}
          </h2>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
          {config.items.length > 0 ? (
            <ol className="space-y-4">
              {config.items.map((item, index) => {
                const itemDescription = resolveLocalizedText(
                  item.description,
                  locale
                );
                return (
                  <li key={item.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--website-primary-solid)] text-xs font-semibold text-white"
                    >
                      {(index + 1).toLocaleString(
                        locale === 'ar' ? 'ar-EG' : 'en-US'
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="break-words font-medium text-foreground">
                        {resolveLocalizedText(item.title, locale)}
                      </h3>
                      {itemDescription ? (
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {itemDescription}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {config.cta && ctaLabel ? (
            href ? (
              <Button asChild>
                {linkRenderer!({
                  href,
                  external: isExternalHref(href),
                  children: ctaLabel,
                })}
              </Button>
            ) : (
              <Button>{ctaLabel}</Button>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
