/**
 * Layout and content primitives for the static marketing site. They render
 * plain semantic HTML (no client React), so everything here must work with
 * JavaScript disabled.
 */
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/shared/utils/class-name.utils';
import type { MarketingLang } from '../types';
import { formatNumber } from '../lib/site';

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-marketing px-5 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  tinted = false,
  labelledBy,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tinted?: boolean;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      data-mkt-section={id}
      aria-labelledby={labelledBy}
      className={cn('py-16 lg:py-24', tinted && 'bg-surface', className)}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = 'start',
  level = 2,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'start' | 'center';
  level?: 2 | 1;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? <p className="mk-eyebrow mb-4">{eyebrow}</p> : null}
      <Heading
        id={id}
        className={cn(
          'mk-heading font-semibold tracking-[-0.02em] text-foreground',
          level === 1
            ? 'text-[2.25rem] leading-[1.1] sm:text-5xl lg:text-6xl'
            : 'text-3xl leading-[1.15] sm:text-4xl lg:text-[2.75rem]',
        )}
      >
        {title}
      </Heading>
      {lead ? (
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className,
  lang,
  arrow = false,
  dir,
  track,
}: {
  track?: 'cta_t' | 'cta_c' | 'cta_pricing';
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  lang?: string;
  arrow?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  return (
    <a href={href} lang={lang} data-mkt-cta={track} className={cn('mk-btn', `mk-btn-${variant}`, className)}>
      {children}
      {arrow ? <Arrow className="size-4" aria-hidden strokeWidth={1.75} /> : null}
    </a>
  );
}

/** Icon + title + body cards in a responsive grid. */
export function FeatureGrid({
  items,
  columns = 3,
}: {
  items: readonly { icon?: ReactNode; title: string; body: ReactNode }[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <ul
      className={cn(
        'mt-12 grid gap-5 sm:grid-cols-2',
        columns === 3 && 'lg:grid-cols-3',
        columns === 4 && 'lg:grid-cols-4',
      )}
    >
      {items.map((item) => (
        <li key={item.title} className="mk-card p-6">
          {item.icon ? (
            <span className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
              {item.icon}
            </span>
          ) : null}
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps (an ordered list, so the order is announced). */
export function StepList({
  steps,
  lang = 'en',
}: {
  steps: readonly { title: string; body: ReactNode }[];
  lang?: MarketingLang;
}) {
  return (
    <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="relative">
          <span
            className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
            aria-hidden
          >
            {formatNumber(lang, index + 1)}
          </span>
          <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** Two honest columns: who Atlas fits now, and who it doesn't yet. */
export function FitColumns({
  fitTitle,
  fit,
  notYetTitle,
  notYet,
}: {
  fitTitle: string;
  fit: readonly string[];
  notYetTitle: string;
  notYet: readonly string[];
}) {
  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2">
      <div className="mk-card p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-foreground">{fitTitle}</h3>
        <ul className="mt-5 space-y-3">
          {fit.map((line) => (
            <li key={line} className="flex gap-3">
              <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden strokeWidth={2} />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mk-card p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-foreground">{notYetTitle}</h3>
        <ul className="mt-5 space-y-3">
          {notYet.map((line) => (
            <li key={line} className="flex gap-3 text-muted-foreground">
              <Minus className="mt-0.5 size-5 shrink-0" aria-hidden strokeWidth={2} />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** FAQ list on native <details>, answers present in the HTML. */
export function Faq({ items }: { items: readonly { question: string; answer: ReactNode }[] }) {
  return (
    <div className="mk-faq mt-10 divide-y divide-border border-y border-border">
      {items.map((item) => (
        <details key={item.question}>
          <summary>
            <span>{item.question}</span>
            <Plus className="mk-faq-icon" aria-hidden strokeWidth={2} />
          </summary>
          <div className="pb-6 pe-10 leading-relaxed text-muted-foreground">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

/** The single tinted closing block on a page. */
export function CtaBand({
  title,
  body,
  primary,
  secondary,
  dir,
}: {
  title: string;
  body?: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  dir: 'ltr' | 'rtl';
}) {
  return (
    <section className="pb-16 pt-4 lg:pb-24" aria-labelledby="closing-cta" data-mkt-section="closing">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-brand-800 px-6 py-14 text-center text-white sm:px-12 dark:bg-brand-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(32rem_18rem_at_100%_0%,hsl(var(--brand-gold)/0.22),transparent_70%),radial-gradient(28rem_18rem_at_0%_100%,hsl(var(--brand-500)/0.35),transparent_70%)]"
          />
          <h2
            id="closing-cta"
            className="mk-heading relative mx-auto max-w-[24ch] text-3xl font-semibold leading-tight text-white sm:text-4xl"
          >
            {title}
          </h2>
          {body ? <p className="relative mx-auto mt-4 max-w-[56ch] text-white/80">{body}</p> : null}
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={primary.href}
              data-mkt-cta="cta_t"
              className="mk-btn bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90"
            >
              {primary.label}
              {dir === 'rtl' ? (
                <ArrowLeft className="size-4" aria-hidden strokeWidth={1.75} />
              ) : (
                <ArrowRight className="size-4" aria-hidden strokeWidth={1.75} />
              )}
            </a>
            {secondary ? (
              <a
                href={secondary.href}
                data-mkt-cta="cta_c"
                className="mk-btn border border-white/30 text-white hover:bg-white/10"
              >
                {secondary.label}
              </a>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function dirOf(lang: MarketingLang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
