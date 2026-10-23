/**
 * Founding Academies `/founding` · `/ar/founding` (B2). The offer, said
 * honestly: the standard annual catalog price locked for 24 months, setup
 * done with the team included, 5 academies a week, 20 seats.
 *
 * Shared by link only: `noindex`, out of the sitemap, llms.txt and the
 * navigation, and never linked from /pricing. No live seat counter: the
 * pages are static and edge-cached, and a counter would need a public
 * endpoint and a client fetch for a number that changes a few times a
 * month (the FAQ says to ask instead). Prices come from the same catalog
 * as /pricing, marked up so `client/main.ts` refreshes them the same way.
 */
import { MessageCircle } from 'lucide-react';
import type { Plan } from '@/types/plan.types';
import {
  ButtonLink,
  Container,
  CtaBand,
  Faq,
  FeatureGrid,
  FitColumns,
  Section,
  SectionHeading,
  StepList,
  dirOf,
} from '../components/ui';
import { HeroArt } from '../components/hero-art';
import { canFill, fill, link, planTokens, splitAt } from '../lib/copy';
import { PLATFORM_WHATSAPP, localePath, selfServePlans, whatsappHref } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import { Icon, Shell, pageEnv, seoHead, type PageEnv } from './shared';

const OFFER_ICONS = ['receipt', 'lock', 'user-cog', 'users'] as const;

/** The WhatsApp CTA, or undefined when the build has no platform number. */
function whatsappLink(env: PageEnv): { href: string; label: string } | undefined {
  const c = env.content.founding.closing;
  const href = whatsappHref(PLATFORM_WHATSAPP, fill(c.whatsappMessage, env.tokens));
  return href ? { href, label: fill(c.whatsapp, env.tokens) } : undefined;
}

/** Self-serve plans with an annual catalog price (the only founding cycle). */
function annualPlans(plans: readonly Plan[]): readonly Plan[] {
  return selfServePlans(plans).filter(
    (plan) => plan.pricing?.yearlyAmount !== undefined && Boolean(plan.pricing?.currency),
  );
}

function AnnualPrices({ env }: { env: PageEnv }) {
  const p = env.content.founding.prices;
  const plans = annualPlans(env.ctx.plans);
  if (plans.length === 0) {
    return <p className="mt-8 text-muted-foreground">{fill(p.unavailable, env.tokens)}</p>;
  }
  return (
    <>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const tokens = planTokens(env.content, plan);
          const parts = splitAt(p.perYear, 'yearlyPrice') ?? ['', ''];
          return (
            <li key={plan.key} data-plan={plan.key} className="mk-card flex flex-col p-6">
              <h3 className="text-lg font-semibold text-foreground">{String(tokens.planName)}</h3>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                {parts[0].trim() ? <span className="text-sm text-muted-foreground">{parts[0].trim()}</span> : null}
                <bdi
                  className="text-3xl font-semibold tracking-tight text-foreground"
                  data-price="yearly"
                  data-amount={plan.pricing?.yearlyAmount}
                  data-currency={plan.pricing?.currency}
                >
                  {String(tokens.yearlyPrice)}
                </bdi>
                {parts[1].trim() ? <span className="text-sm text-muted-foreground">{parts[1].trim()}</span> : null}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">{fill(p.lockNote, env.tokens)}</p>
    </>
  );
}

function FoundingPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const f = content.founding;
  const dir = dirOf(lang);
  const apply = link(lang, f.closing.primaryCta, tokens);
  const whatsapp = whatsappLink(env);
  const faq = faqItems(env);
  return (
    <Shell env={env} path="/founding">
      <section className="relative overflow-hidden border-b border-border" aria-labelledby="founding-title">
        <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
        <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <SectionHeading
              id="founding-title"
              level={1}
              eyebrow={f.hero.eyebrow ? fill(f.hero.eyebrow, tokens) : undefined}
              title={fill(f.hero.title, tokens)}
              lead={f.hero.lead ? fill(f.hero.lead, tokens) : undefined}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={apply.href} track="cta_c" arrow dir={dir}>
                {apply.label}
              </ButtonLink>
              {whatsapp ? (
                <ButtonLink href={whatsapp.href} variant="secondary">
                  <MessageCircle className="size-4" aria-hidden strokeWidth={1.75} />
                  {whatsapp.label}
                </ButtonLink>
              ) : null}
            </div>
          </div>
          <div className="lg:col-span-5">
            <HeroArt name="pricing" className="mx-auto max-w-sm lg:max-w-none" />
          </div>
        </Container>
      </section>

      <Section labelledBy="founding-offer-title">
        <SectionHeading
          id="founding-offer-title"
          title={fill(f.offer.title, tokens)}
          lead={f.offer.lead ? fill(f.offer.lead, tokens) : undefined}
        />
        <FeatureGrid
          columns={4}
          items={f.offer.items.map((item, index) => ({
            icon: <Icon name={OFFER_ICONS[index % OFFER_ICONS.length]} />,
            title: fill(item.title, tokens),
            body: fill(item.body, tokens),
          }))}
        />
      </Section>

      <Section labelledBy="founding-prices-title" className="border-t border-border">
        <SectionHeading
          id="founding-prices-title"
          eyebrow={f.prices.eyebrow ? fill(f.prices.eyebrow, tokens) : undefined}
          title={fill(f.prices.title, tokens)}
          lead={f.prices.lead ? fill(f.prices.lead, tokens) : undefined}
        />
        <AnnualPrices env={env} />
      </Section>

      <Section labelledBy="founding-fit-title" className="border-t border-border">
        <SectionHeading
          id="founding-fit-title"
          title={fill(f.fit.title, tokens)}
          lead={f.fit.lead ? fill(f.fit.lead, tokens) : undefined}
        />
        <FitColumns
          fitTitle={fill(f.fit.fitTitle, tokens)}
          fit={f.fit.fit.map((line) => fill(line, tokens))}
          notYetTitle={fill(f.fit.notYetTitle, tokens)}
          notYet={f.fit.notYet.map((line) => fill(line, tokens))}
        />
      </Section>

      <Section labelledBy="founding-steps-title" className="border-t border-border">
        <SectionHeading id="founding-steps-title" title={fill(f.steps.title, tokens)} />
        <StepList
          lang={lang}
          steps={f.steps.items.map((item) => ({ title: fill(item.title, tokens), body: fill(item.body, tokens) }))}
        />
      </Section>

      {faq.length > 0 ? (
        <Section id={f.faq.anchor ?? 'faq'} labelledBy="founding-faq-title" className="border-t border-border">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <SectionHeading
              id="founding-faq-title"
              eyebrow={f.faq.eyebrow ? fill(f.faq.eyebrow, tokens) : undefined}
              title={fill(f.faq.title, tokens)}
              lead={f.faq.lead ? fill(f.faq.lead, tokens) : undefined}
            />
            <Faq items={faq} />
          </div>
        </Section>
      ) : null}

      <CtaBand
        title={fill(f.closing.title, tokens)}
        body={f.closing.lead ? fill(f.closing.lead, tokens) : undefined}
        primary={apply}
        secondary={whatsapp}
        dir={dir}
      />
    </Shell>
  );
}

function faqItems(env: PageEnv) {
  return env.content.founding.faq.items
    .filter((qa) => canFill(qa.question, env.tokens) && canFill(qa.answer, env.tokens))
    .map((qa) => ({ question: fill(qa.question, env.tokens), answer: fill(qa.answer, env.tokens) }));
}

/** `noindex`: kept out of search, the sitemap and llms.txt (shared by link only). */
export const FOUNDING_ROBOTS = 'noindex, follow';

function foundingPage(lang: MarketingLang): MarketingPageDef {
  return {
    id: 'founding',
    lang,
    path: localePath(lang, '/founding'),
    file: lang === 'ar' ? 'ar/founding/index.html' : 'founding/index.html',
    inSitemap: false,
    head: (ctx) => ({
      ...seoHead(pageEnv(lang, ctx), 'founding', '/founding', []),
      robots: FOUNDING_ROBOTS,
    }),
    render: (ctx) => <FoundingPage env={pageEnv(lang, ctx)} />,
  };
}

export const FOUNDING_PAGES = [foundingPage('en'), foundingPage('ar')] as const;
