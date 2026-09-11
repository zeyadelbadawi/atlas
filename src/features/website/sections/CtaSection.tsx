/**
 * CTA (call-to-action banner) Section.
 */
import { Button } from '@/components/ui/button';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import {
  resolveWebsiteCtaHref,
  isExternalHref,
} from '../utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { CtaSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface CtaSectionProps {
  readonly config: CtaSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function CtaSection({
  config,
  pages,
  linkRenderer,
}: CtaSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const href = linkRenderer
    ? resolveWebsiteCtaHref(config.cta, pages)
    : undefined;
  const ctaLabel = resolveLocalizedText(config.cta.label, locale);

  return (
    <section className={section}>
      <div
        className={`${container} flex flex-col items-center gap-4 py-16 text-center text-white`}
        style={{
          backgroundColor: 'var(--website-primary-solid)',
          borderRadius: 'var(--website-radius)',
        }}
      >
        <h2 className={`${heading} max-w-2xl break-words text-3xl`}>
          {resolveLocalizedText(config.title, locale)}
        </h2>
        {config.description ? (
          <p className="max-w-xl opacity-90">
            {resolveLocalizedText(config.description, locale)}
          </p>
        ) : null}
        {href ? (
          <Button size="lg" variant="secondary" asChild>
            {linkRenderer!({
              href,
              external: isExternalHref(href),
              children: ctaLabel,
            })}
          </Button>
        ) : (
          <Button size="lg" variant="secondary">
            {ctaLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
