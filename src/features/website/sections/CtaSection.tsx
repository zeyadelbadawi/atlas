/**
 * CTA (call-to-action banner) Section.
 */
import { Button } from '@/components/ui/button';
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import { resolveWebsiteCtaHref, isExternalHref } from '../utils/link-resolution.utils';
import type { CtaSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface CtaSectionProps {
  readonly config: CtaSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function CtaSection({ config, pages, linkRenderer }: CtaSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const href = linkRenderer ? resolveWebsiteCtaHref(config.cta, pages) : undefined;

  return (
    <section className={section}>
      <div
        className={`${container} flex flex-col items-center gap-4 py-16 text-center text-white`}
        style={{
          backgroundColor: 'var(--website-primary-solid)',
          borderRadius: 'var(--website-radius)',
        }}
      >
        <h2 className={`${heading} text-3xl`}>{config.title}</h2>
        {config.description ? (
          <p className="max-w-xl opacity-90">{config.description}</p>
        ) : null}
        {href ? (
          <Button size="lg" variant="secondary" asChild>
            {linkRenderer!({ href, external: isExternalHref(href), children: config.cta.label })}
          </Button>
        ) : (
          <Button size="lg" variant="secondary">
            {config.cta.label}
          </Button>
        )}
      </div>
    </section>
  );
}
