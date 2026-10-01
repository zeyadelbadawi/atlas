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
  const secondaryHref = linkRenderer
    ? resolveWebsiteCtaHref(config.secondaryCta, pages)
    : undefined;
  const secondaryLabel = config.secondaryCta
    ? resolveLocalizedText(config.secondaryCta.label, locale)
    : '';
  const primaryButton = href ? (
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
  );

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
        {/* Theme 1 plan §D.2 — the optional second action; without one the
            markup is exactly what it always was. */}
        {config.secondaryCta && secondaryLabel ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {primaryButton}
            {secondaryHref ? (
              <Button
                size="lg"
                variant="outline"
                className="border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                {linkRenderer!({
                  href: secondaryHref,
                  external: isExternalHref(secondaryHref),
                  children: secondaryLabel,
                })}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {secondaryLabel}
              </Button>
            )}
          </div>
        ) : (
          primaryButton
        )}
      </div>
    </section>
  );
}
