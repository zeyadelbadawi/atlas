/**
 * Hero Section.
 *
 * The one section with real structural variance per theme — `heroVariant`
 * branches JSX (split / centered / fullbleed / minimal), not just styling.
 * It is the first thing a visitor sees, so it carries the most weight in
 * making five themes feel like five different websites.
 */
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebsiteDesignSystem } from '../renderer/WebsiteDesignSystemContext';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
} from '../renderer/renderer-style.utils';
import { resolveWebsiteCtaHref, isExternalHref } from '../utils/link-resolution.utils';
import type { HeroSectionConfig, WebsiteCta, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface HeroSectionProps {
  readonly config: HeroSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

/** Wraps a `<Button>` in the real link supplied by `linkRenderer` when the CTA resolves to something navigable; otherwise renders the plain, inert button exactly as every dashboard preview context already expects. */
function CtaButton({
  cta,
  pages,
  linkRenderer,
  children,
  ...buttonProps
}: {
  readonly cta: WebsiteCta;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly children: ReactNode;
} & ComponentProps<typeof Button>): JSX.Element {
  const href = linkRenderer ? resolveWebsiteCtaHref(cta, pages) : undefined;

  if (href) {
    return (
      <Button asChild {...buttonProps}>
        {linkRenderer!({ href, external: isExternalHref(href), children })}
      </Button>
    );
  }

  return <Button {...buttonProps}>{children}</Button>;
}

function HeroActions({ config, pages, linkRenderer }: HeroSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!config.cta && !config.secondaryCta) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {config.cta ? (
        <CtaButton
          cta={config.cta}
          pages={pages}
          linkRenderer={linkRenderer}
          size="lg"
          style={{ backgroundColor: 'var(--website-primary-solid)' }}
          className="text-white hover:opacity-90"
        >
          {config.cta.label}
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
        </CtaButton>
      ) : null}
      {config.secondaryCta ? (
        <CtaButton cta={config.secondaryCta} pages={pages} linkRenderer={linkRenderer} size="lg" variant="outline">
          {config.secondaryCta.label}
        </CtaButton>
      ) : null}
      <span className="sr-only">{t('website:renderer.hero')}</span>
    </div>
  );
}

export function HeroSection({ config, pages, linkRenderer }: HeroSectionProps): JSX.Element {
  const design = useWebsiteDesignSystem();
  const container = useWebsiteContainerClass();
  const headingClass = useWebsiteHeadingClass();

  if (design.heroVariant === 'split') {
    return (
      <section className={`${container} grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24`}>
        <div className="space-y-5">
          {config.eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--website-primary-solid)]">
              {config.eyebrow}
            </p>
          ) : null}
          {config.subtitle ? (
            <p className="text-sm font-medium text-[var(--website-primary-solid)]">
              {config.subtitle}
            </p>
          ) : null}
          <h1 className={`${headingClass} text-4xl leading-tight text-foreground sm:text-5xl`}>
            {config.title}
          </h1>
          {config.description ? (
            <p className="max-w-prose text-lg text-muted-foreground">{config.description}</p>
          ) : null}
          <HeroActions config={config} pages={pages} linkRenderer={linkRenderer} />
        </div>
        <div
          className="aspect-[4/3] w-full bg-[var(--website-primary-surface)]"
          style={{ borderRadius: 'var(--website-radius)' }}
        >
          {config.image ? (
            <img
              src={config.image}
              alt={config.imageAlt ?? ''}
              className="size-full object-cover"
              style={{ borderRadius: 'var(--website-radius)' }}
            />
          ) : null}
        </div>
      </section>
    );
  }

  if (design.heroVariant === 'fullbleed') {
    return (
      <section
        className="relative flex min-h-[28rem] items-end overflow-hidden bg-[var(--website-primary-surface)] py-16"
        style={config.image ? { backgroundImage: `url(${config.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {config.image ? (
          <div className="absolute inset-0 bg-black/45" aria-hidden />
        ) : null}
        <div className={`${container} relative space-y-5 ${config.image ? 'text-white' : 'text-foreground'}`}>
          {config.eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-wide opacity-90">{config.eyebrow}</p>
          ) : null}
          {config.subtitle ? (
            <p className="text-sm font-medium opacity-90">{config.subtitle}</p>
          ) : null}
          <h1 className={`${headingClass} text-4xl leading-tight sm:text-6xl`}>{config.title}</h1>
          {config.description ? (
            <p className="max-w-2xl text-lg opacity-90">{config.description}</p>
          ) : null}
          <HeroActions config={config} pages={pages} linkRenderer={linkRenderer} />
        </div>
      </section>
    );
  }

  if (design.heroVariant === 'minimal') {
    return (
      <section className={`${container} space-y-4 border-b border-border py-16`}>
        {config.eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{config.eyebrow}</p>
        ) : null}
        {config.subtitle ? (
          <p className="text-sm font-medium text-muted-foreground">{config.subtitle}</p>
        ) : null}
        <h1 className={`${headingClass} max-w-3xl text-3xl leading-tight text-foreground sm:text-4xl`}>
          {config.title}
        </h1>
        {config.description ? (
          <p className="max-w-2xl text-base text-muted-foreground">{config.description}</p>
        ) : null}
        <HeroActions config={config} pages={pages} linkRenderer={linkRenderer} />
      </section>
    );
  }

  // centered
  return (
    <section className={`${container} space-y-6 py-20 text-center`}>
      {config.eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--website-primary-solid)]">
          {config.eyebrow}
        </p>
      ) : null}
      {config.subtitle ? (
        <p className="text-sm font-medium text-[var(--website-primary-solid)]">{config.subtitle}</p>
      ) : null}
      <h1 className={`${headingClass} mx-auto max-w-3xl text-4xl leading-tight text-foreground sm:text-5xl`}>
        {config.title}
      </h1>
      {config.description ? (
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">{config.description}</p>
      ) : null}
      <div className="flex justify-center">
        <HeroActions config={config} pages={pages} linkRenderer={linkRenderer} />
      </div>
    </section>
  );
}
