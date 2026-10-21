/**
 * Pricing `/pricing` · `/ar/pricing` — SPEC §C. Built only from the catalog
 * fetched at build time (the client refreshes prices; a failed refresh keeps
 * these). Section order: H1 → cards → limits table → trial → what's included
 * and what isn't → paying Atlas → changes → FAQ → closing.
 */
import { Check, Minus } from 'lucide-react';
import type { Plan } from '@/types/plan.types';
import { Container, CtaBand, Faq, Section, SectionHeading, dirOf } from '../components/ui';
import { LimitsTable, PricingCards } from '../components/pricing';
import { canFill, fill, link, planTokens, plural } from '../lib/copy';
import { formatDate, localePath, registerHref, selfServePlans } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import { Shell, appId, breadcrumb, faqPage, orgId, pageEnv, seoHead, webPage, type PageEnv } from './shared';

function Bullets({ items, tokens, muted = false }: { items: readonly string[]; tokens: Record<string, string | number>; muted?: boolean }) {
  const IconC = muted ? Minus : Check;
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className={muted ? 'flex gap-3 text-muted-foreground' : 'flex gap-3'}>
          <IconC className={muted ? 'mt-1 size-4 shrink-0' : 'mt-1 size-4 shrink-0 text-success'} aria-hidden strokeWidth={2.25} />
          <span className="leading-relaxed">{fill(item, tokens)}</span>
        </li>
      ))}
    </ul>
  );
}

function giftedLines(env: PageEnv): string[] {
  const p = env.content.pricing.trial;
  const lines = new Set<string>();
  for (const plan of selfServePlans(env.ctx.plans)) {
    const t = planTokens(env.content, plan);
    if (plan.giftedDaysYearly && canFill(p.giftedYearly, t)) lines.add(fill(p.giftedYearly, t));
    if (plan.giftedDaysMonthly) {
      const monthly = { ...t, giftedDuration: plural(env.content, env.content.plurals.days, plan.giftedDaysMonthly) };
      if (canFill(p.giftedMonthly, monthly)) lines.add(fill(p.giftedMonthly, monthly));
    }
  }
  return [...lines];
}

function PricingPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang, ctx } = env;
  const p = content.pricing;
  const dir = dirOf(lang);
  const updated = fill(p.pricesUpdated, { ...tokens, date: formatDate(lang, ctx.buildDate) });
  const trialItems = p.trial.items.filter((item) => canFill(item, tokens));

  return (
    <Shell env={env} path="/pricing" currentId="pricing">
      <section className="relative overflow-hidden border-b border-border" aria-labelledby="pricing-title">
        <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
        <Container className="relative py-14 lg:py-20">
          <SectionHeading
            id="pricing-title"
            level={1}
            align="center"
            eyebrow={p.hero.eyebrow ? fill(p.hero.eyebrow, tokens) : undefined}
            title={fill(p.hero.title, tokens)}
            lead={p.hero.lead ? fill(p.hero.lead, tokens) : undefined}
          />
          <PricingCards plans={ctx.plans} content={content} tokens={tokens} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {fill(p.currencyNote, tokens)} · <time dateTime={ctx.buildDate}>{updated}</time>
          </p>
        </Container>
      </section>

      <Section labelledBy="included-title">
        <h2 id="included-title" className="mk-heading text-2xl font-semibold text-foreground sm:text-3xl">
          {fill(p.includedInEvery.title, tokens)}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {p.includedInEvery.items.map((item) => (
            <li key={item} className="flex gap-3 rounded-lg border border-border p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden strokeWidth={2.25} />
              <span>{fill(item, tokens)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="limits" labelledBy="limits-title" className="border-t border-border">
        <h2 id="limits-title" className="mk-heading text-2xl font-semibold text-foreground sm:text-3xl">
          {fill(p.limitsTable.title, tokens)}
        </h2>
        <LimitsTable plans={ctx.plans} content={content} />
      </Section>

      {trialItems.length > 0 ? (
        <Section id="trial" labelledBy="trial-title" className="border-t border-border">
          <div className="grid gap-10 lg:grid-cols-2">
            <SectionHeading
              id="trial-title"
              eyebrow={p.trial.eyebrow ? fill(p.trial.eyebrow, tokens) : undefined}
              title={fill(p.trial.title, tokens)}
              lead={p.trial.lead && canFill(p.trial.lead, tokens) ? fill(p.trial.lead, tokens) : undefined}
            />
            <Bullets items={[...trialItems, ...giftedLines(env)]} tokens={tokens} />
          </div>
        </Section>
      ) : null}

      <Section id="honest-limits" labelledBy="honest-title" className="border-t border-border">
        <SectionHeading
          id="honest-title"
          eyebrow={p.honestLimits.eyebrow ? fill(p.honestLimits.eyebrow, tokens) : undefined}
          title={fill(p.honestLimits.title, tokens)}
          lead={p.honestLimits.lead ? fill(p.honestLimits.lead, tokens) : undefined}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="mk-card p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-foreground">{fill(p.honestLimits.includedTitle, tokens)}</h3>
            <Bullets items={p.honestLimits.included} tokens={tokens} />
          </div>
          <div className="mk-card p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-foreground">{fill(p.honestLimits.notYetTitle, tokens)}</h3>
            <Bullets items={p.honestLimits.notYet} tokens={tokens} muted />
          </div>
        </div>
      </Section>

      <Section labelledBy="paying-title" className="border-t border-border">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              id="paying-title"
              eyebrow={p.payingAtlas.eyebrow ? fill(p.payingAtlas.eyebrow, tokens) : undefined}
              title={fill(p.payingAtlas.title, tokens)}
              lead={p.payingAtlas.lead ? fill(p.payingAtlas.lead, tokens) : undefined}
            />
            <Bullets items={p.payingAtlas.items} tokens={tokens} />
          </div>
          <div>
            <h2 className="mk-heading text-2xl font-semibold text-foreground sm:text-3xl">{fill(p.changes.title, tokens)}</h2>
            {p.changes.lead ? <p className="mt-4 leading-relaxed text-muted-foreground">{fill(p.changes.lead, tokens)}</p> : null}
            <dl className="mt-6 space-y-5">
              {p.changes.items.map((item) => (
                <div key={item.title}>
                  <dt className="font-semibold text-foreground">{fill(item.title, tokens)}</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">{fill(item.body, tokens)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6">
              <a href={link(lang, p.changes.termsLink, tokens).href} className="mk-btn-ghost font-semibold">
                {fill(p.changes.termsLink.label, tokens)}
              </a>
            </p>
          </div>
        </div>
      </Section>

      <Section id={p.faq.anchor ?? 'faq'} labelledBy="pricing-faq-title" className="border-t border-border">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading
            id="pricing-faq-title"
            eyebrow={p.faq.eyebrow ? fill(p.faq.eyebrow, tokens) : undefined}
            title={fill(p.faq.title, tokens)}
            lead={p.faq.lead ? fill(p.faq.lead, tokens) : undefined}
          />
          <Faq items={faqItems(env)} />
        </div>
      </Section>

      <CtaBand
        title={fill(p.closing.title, tokens)}
        body={p.closing.lead ? fill(p.closing.lead, tokens) : undefined}
        primary={link(lang, p.closing.primaryCta, tokens)}
        secondary={p.closing.secondaryCta ? link(lang, p.closing.secondaryCta, tokens) : undefined}
        dir={dir}
      />
    </Shell>
  );
}

function faqItems(env: PageEnv) {
  return env.content.pricing.faq.items
    .filter((qa) => canFill(qa.question, env.tokens) && canFill(qa.answer, env.tokens))
    .map((qa) => ({ question: fill(qa.question, env.tokens), answer: fill(qa.answer, env.tokens) }));
}

/** One Offer per billing period of each priced plan (SPEC §C Schema). */
function offers(env: PageEnv, plan: Plan): object[] {
  const pricing = plan.pricing;
  if (!pricing?.currency) return [];
  const name = planTokens(env.content, plan).planName;
  // DL-63 — absolute already when the app has its own origin; relative
  // (same origin) only in builds without one.
  const register = registerHref(env.lang, plan.key);
  const url = /^https?:\/\//.test(register) ? register : `${env.ctx.siteUrl}${register}`;
  const offer = (price: number, duration: 'P1M' | 'P1Y') => ({
    '@type': 'Offer',
    name: String(name),
    price: String(price),
    priceCurrency: pricing.currency,
    url,
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(price),
      priceCurrency: pricing.currency,
      billingDuration: duration,
      unitText: duration === 'P1M' ? 'MON' : 'ANN',
    },
  });
  return [
    ...(pricing.amount !== undefined ? [offer(pricing.amount, 'P1M')] : []),
    ...(pricing.yearlyAmount !== undefined ? [offer(pricing.yearlyAmount, 'P1Y')] : []),
  ];
}

function pricingPage(lang: MarketingLang): MarketingPageDef {
  return {
    id: 'pricing',
    lang,
    path: localePath(lang, '/pricing'),
    file: lang === 'ar' ? 'ar/pricing/index.html' : 'pricing/index.html',
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      return seoHead(env, 'pricing', '/pricing', [
        webPage(env, '/pricing', fill(env.content.seo.pricing.ogTitle, env.tokens)),
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          '@id': appId(ctx.siteUrl),
          name: fill(env.content.jsonLd.softwareApplicationName, env.tokens),
          description: fill(env.content.jsonLd.softwareApplicationDescription, env.tokens),
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          inLanguage: ['en', 'ar'],
          publisher: { '@id': orgId(ctx.siteUrl) },
          offers: selfServePlans(ctx.plans).flatMap((plan) => offers(env, plan)),
        },
        breadcrumb(env, [{ name: env.content.chrome.header.pricing, path: '/pricing' }]),
        faqPage(env, faqItems(env)),
      ]);
    },
    render: (ctx) => <PricingPage env={pageEnv(lang, ctx)} />,
  };
}

export const PRICING_PAGES = [pricingPage('en'), pricingPage('ar')] as const;
