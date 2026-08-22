/**
 * Hero Section.
 *
 * The one section with real structural variance per theme — `heroVariant`
 * branches JSX (split / centered / fullbleed / minimal), not just styling.
 * It is the first thing a visitor sees, so it carries the most weight in
 * making five themes feel like five different websites.
 */
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebsiteDesignSystem } from '../renderer/WebsiteDesignSystemContext';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
} from '../renderer/renderer-style.utils';
import type { HeroSectionConfig } from '@types';

export interface HeroSectionProps {
  readonly config: HeroSectionConfig;
}

function HeroActions({ config }: HeroSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!config.cta && !config.secondaryCta) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {config.cta ? (
        <Button
          size="lg"
          style={{ backgroundColor: 'var(--website-primary-solid)' }}
          className="text-white hover:opacity-90"
        >
          {config.cta.label}
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
        </Button>
      ) : null}
      {config.secondaryCta ? (
        <Button size="lg" variant="outline">
          {config.secondaryCta.label}
        </Button>
      ) : null}
      <span className="sr-only">{t('website:renderer.hero')}</span>
    </div>
  );
}

export function HeroSection({ config }: HeroSectionProps): JSX.Element {
  const design = useWebsiteDesignSystem();
  const container = useWebsiteContainerClass();
  const headingClass = useWebsiteHeadingClass();

  if (design.heroVariant === 'split') {
    return (
      <section className={`${container} grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24`}>
        <div className="space-y-5">
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
          <HeroActions config={config} />
        </div>
        <div
          className="aspect-[4/3] w-full bg-[var(--website-primary-surface)]"
          style={{ borderRadius: 'var(--website-radius)' }}
        >
          {config.image ? (
            <img
              src={config.image}
              alt=""
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
          {config.subtitle ? (
            <p className="text-sm font-medium opacity-90">{config.subtitle}</p>
          ) : null}
          <h1 className={`${headingClass} text-4xl leading-tight sm:text-6xl`}>{config.title}</h1>
          {config.description ? (
            <p className="max-w-2xl text-lg opacity-90">{config.description}</p>
          ) : null}
          <HeroActions config={config} />
        </div>
      </section>
    );
  }

  if (design.heroVariant === 'minimal') {
    return (
      <section className={`${container} space-y-4 border-b border-border py-16`}>
        {config.subtitle ? (
          <p className="text-sm font-medium text-muted-foreground">{config.subtitle}</p>
        ) : null}
        <h1 className={`${headingClass} max-w-3xl text-3xl leading-tight text-foreground sm:text-4xl`}>
          {config.title}
        </h1>
        {config.description ? (
          <p className="max-w-2xl text-base text-muted-foreground">{config.description}</p>
        ) : null}
        <HeroActions config={config} />
      </section>
    );
  }

  // centered
  return (
    <section className={`${container} space-y-6 py-20 text-center`}>
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
        <HeroActions config={config} />
      </div>
    </section>
  );
}
