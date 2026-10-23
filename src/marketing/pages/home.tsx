/**
 * Home `/` · `/ar` — SPEC §B.4 narrative: hero → facts → routine → payments
 * → website → team → assessments → students → languages → how it works →
 * fit → pricing → FAQ → assisted setup → closing. Each section opens with a
 * self-contained answer (the copy's `lead`), which is what AI answer engines
 * quote (GEO).
 */
import type { ReactNode } from 'react';
import { BadgeCheck, BarChart3, Check, ClipboardCheck, Globe, Languages, LayoutTemplate, ListChecks, Mail, MonitorSmartphone, Palette, UserPlus, type LucideIcon } from 'lucide-react';
import type { MarketingProductPageId, MkItem, MkSectionHead } from '../content/content.types';
import { ButtonLink, Container, CtaBand, Faq, FitColumns, MoreLink, Section, SectionHeading, StepList, dirOf } from '../components/ui';
import { PricingCards } from '../components/pricing';
import { Screenshot } from '../components/screenshot';
import { AtlasMark, productPagePath } from '../components/chrome';
import { canFill, fill, link } from '../lib/copy';
import { formatNumber } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import { DEMO_ACADEMY_HOST } from '../data/demo';
import { Icon, Shell, entityGraph, faqPage, pageEnv, seoHead, webPage, type PageEnv } from './shared';

function Head({ env, head, id, level = 2 }: { env: PageEnv; head: MkSectionHead; id: string; level?: 1 | 2 }) {
  return (
    <SectionHeading
      id={id}
      level={level}
      eyebrow={head.eyebrow ? fill(head.eyebrow, env.tokens) : undefined}
      title={fill(head.title, env.tokens)}
      lead={head.lead ? fill(head.lead, env.tokens) : undefined}
    />
  );
}

/** IA §5 — each pillar links to its product page with descriptive anchor text. */
function ProductMore({ env, id }: { env: PageEnv; id: MarketingProductPageId }) {
  const label = env.content.chrome.productPages.find((p) => p.id === id)?.moreLabel;
  if (!label) return null;
  return (
    <div>
      <MoreLink href={productPagePath(env.lang, id)} dir={dirOf(env.lang)}>
        {fill(label, env.tokens)}
      </MoreLink>
    </div>
  );
}

function ItemList({ env, items, icons }: { env: PageEnv; items: readonly MkItem[]; icons: readonly LucideIcon[] }) {
  return (
    <ul className="mt-8 space-y-6">
      {items.map((item, index) => {
        const IconC = icons[index % icons.length];
        return (
          <li key={item.title} className="flex gap-4">
            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <IconC className="size-5" aria-hidden strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">{fill(item.title, env.tokens)}</h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">{fill(item.body, env.tokens)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const WEBSITE_ICONS: readonly LucideIcon[] = [Palette, LayoutTemplate, Languages, Globe];
const ASSESSMENT_ICONS: readonly LucideIcon[] = [ListChecks, ClipboardCheck, BadgeCheck];
const STUDENT_ICONS: readonly LucideIcon[] = [UserPlus, BarChart3, Mail, MonitorSmartphone];

/** Text on one side, product screenshot on the other; alternates by `flip`. */
function Split({ text, media, flip = false }: { text: ReactNode; media: ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? 'lg:order-2' : undefined}>{text}</div>
      <div className={flip ? 'lg:order-1' : undefined}>{media}</div>
    </div>
  );
}

function HomePage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const h = content.home;
  const dir = dirOf(lang);
  const demo = content.chrome.demoLabel;
  const micro = canFill(h.hero.microcopy, tokens) ? fill(h.hero.microcopy, tokens) : undefined;
  const primary = link(lang, h.hero.primaryCta, tokens);
  const secondary = link(lang, h.hero.secondaryCta, tokens);
  const paymentsCta = link(lang, h.payments.cta, tokens);
  const closing = h.closing;
  const closingMicro = closing.microcopy && canFill(closing.microcopy, tokens) ? fill(closing.microcopy, tokens) : undefined;

  return (
    <Shell env={env} path="/" currentId="home">
      {/* S1 Hero */}
      <section className="relative overflow-hidden border-b border-border" aria-labelledby="hero-title" data-mkt-section="s1_hero">
        <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
        <Container className="relative grid items-center gap-12 py-14 lg:min-h-[min(88svh,52rem)] lg:grid-cols-12 lg:py-20">
          <div className="mk-rise lg:col-span-6">
            <p className="mk-eyebrow mb-5">{fill(h.hero.eyebrow, tokens)}</p>
            <h1
              id="hero-title"
              className="mk-heading text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.5rem]"
            >
              {fill(h.hero.title, tokens)}
            </h1>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">{fill(h.hero.lead, tokens)}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={primary.href} signedIn={primary.signedIn} arrow dir={dir} track="cta_t" className="px-6 text-base">
                {primary.label}
              </ButtonLink>
              <ButtonLink href={secondary.href} variant="secondary" track="cta_c" className="px-6 text-base">
                {secondary.label}
              </ButtonLink>
            </div>
            {micro ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" data-signed-out-only="">
                <Check className="size-4 text-success" aria-hidden strokeWidth={2.25} />
                {micro}
              </p>
            ) : null}
          </div>
          <div className="mk-rise mk-rise-delay relative lg:col-span-6">
            <div aria-hidden className="absolute -inset-6 -z-0 rounded-[2rem] bg-gradient-to-br from-brand-200/50 via-transparent to-brand-gold/20 blur-2xl dark:from-brand-700/40" />
            <Screenshot
              name="academy-site-home"
              lang={lang}
              alt={fill(content.chrome.media.heroScreenshotAlt, tokens)}
              demoLabel={demo}
              priority
              frameUrl={DEMO_ACADEMY_HOST}
              className="relative"
              sizes="(min-width: 1024px) 600px, 100vw"
            />
          </div>
        </Container>
      </section>

      {/* S2 Facts */}
      <section aria-label={h.facts.label} className="border-b border-border">
        <Container>
          <ul className="grid gap-px overflow-hidden py-2 sm:grid-cols-2 lg:grid-cols-4">
            {h.facts.items.map((fact) => (
              <li key={fact.text} className="flex items-start gap-3 px-2 py-6 sm:px-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon name={fact.icon} />
                </span>
                <span className="pt-2 text-[0.95rem] font-medium leading-snug text-foreground">{fill(fact.text, tokens)}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* S3 Routine */}
      <Section labelledBy="routine-title">
        <Head env={env} head={h.routine} id="routine-title" />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {h.routine.items.map((item, index) => (
            <li key={item.title} className="mk-card relative p-6">
              <span className="font-display text-sm font-semibold text-brand-gold-text" aria-hidden>
                {new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumIntegerDigits: 2 }).format(index + 1)}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{fill(item.title, tokens)}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{fill(item.body, tokens)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <a href={link(lang, h.routine.link, tokens).href} className="mk-btn-ghost font-semibold">
            {fill(h.routine.link.label, tokens)}
          </a>
        </p>
      </Section>

      {/* S4 Payments */}
      <Section id={h.payments.anchor} labelledBy="payments-title" className="border-t border-border">
        <Split
          text={
            <>
              <Head env={env} head={h.payments} id="payments-title" />
              <ol className="mt-10 space-y-6">
                {h.payments.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      {formatNumber(lang, index + 1)}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{fill(step.title, tokens)}</h3>
                      <p className="mt-1 leading-relaxed text-muted-foreground">{fill(step.body, tokens)}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <ul className="mt-8 space-y-2">
                {h.payments.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden strokeWidth={2.25} />
                    <span>{fill(point, tokens)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-base leading-relaxed">
                {fill(h.payments.disclosure, tokens)}
              </p>
              <div className="mt-8">
                <ButtonLink href={paymentsCta.href} signedIn={paymentsCta.signedIn} arrow dir={dir} track="cta_t">
                  {fill(h.payments.cta.label, tokens)}
                </ButtonLink>
              </div>
              <ProductMore env={env} id="payments" />
            </>
          }
          media={
            <Screenshot
              name="payments-review"
              lang={lang}
              alt={fill(h.payments.steps[2]?.title ?? h.payments.title, tokens)}
              caption={fill(h.payments.steps[2]?.body ?? '', tokens)}
              demoLabel={demo}
            />
          }
        />
      </Section>

      {/* S6 Website */}
      <Section id={h.website.anchor} labelledBy="website-title" className="border-t border-border">
        <Split
          flip
          text={
            <>
              <Head env={env} head={h.website} id="website-title" />
              <ItemList env={env} items={h.website.items} icons={WEBSITE_ICONS} />
              <ProductMore env={env} id="academy-website" />
            </>
          }
          media={
            <div className="relative">
              <Screenshot name="website-editor" lang={lang} alt={fill(h.website.title, tokens)} demoLabel={demo} />
              <div className="absolute -bottom-10 end-[-0.5rem] hidden w-40 sm:block lg:w-44">
                <Screenshot
                  name="academy-site-home-mobile"
                  lang={lang}
                  alt={fill(h.website.items[2]?.body ?? h.website.title, tokens)}
                  demoLabel={demo}
                  device="mobile"
                  sizes="176px"
                  className="[&_figcaption]:hidden"
                />
              </div>
            </div>
          }
        />
      </Section>

      {/* S7 Team */}
      <Section id={h.team.anchor} labelledBy="team-title" className="border-t border-border">
        <Head env={env} head={h.team} id="team-title" />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {h.team.items.map((item) => (
            <li key={item.title} className="mk-card p-6">
              <h3 className="text-lg font-semibold text-foreground">{fill(item.title, tokens)}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{fill(item.body, tokens)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-dashed border-border-strong p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{fill(h.team.moreAcademies.title, tokens)}</h3>
            <p className="mt-1 max-w-[62ch] leading-relaxed text-muted-foreground">{fill(h.team.moreAcademies.body, tokens)}</p>
          </div>
          <a href={link(lang, h.team.cta, tokens).href} className="mk-btn mk-btn-secondary shrink-0">
            {fill(h.team.cta.label, tokens)}
          </a>
        </div>
        <ProductMore env={env} id="teams-and-academies" />
      </Section>

      {/* S8 Assessments */}
      <Section id={h.assessments.anchor} labelledBy="assessments-title" className="border-t border-border">
        <Split
          text={
            <>
              <Head env={env} head={h.assessments} id="assessments-title" />
              <ItemList env={env} items={h.assessments.items} icons={ASSESSMENT_ICONS} />
              <ProductMore env={env} id="quizzes-and-certificates" />
            </>
          }
          media={<Screenshot name="quiz-builder" lang={lang} alt={fill(h.assessments.title, tokens)} demoLabel={demo} />}
        />
      </Section>

      {/* Students and reports */}
      <Section id={h.students.anchor} labelledBy="students-title" className="border-t border-border">
        <Split
          flip
          text={
            <>
              <Head env={env} head={h.students} id="students-title" />
              <ItemList env={env} items={h.students.items} icons={STUDENT_ICONS} />
            </>
          }
          media={<Screenshot name="students-list" lang={lang} alt={fill(h.students.title, tokens)} demoLabel={demo} />}
        />
      </Section>

      {/* Arabic and English */}
      <Section id={h.languages.anchor} labelledBy="languages-title" className="border-t border-border">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <Head env={env} head={h.languages} id="languages-title" />
          <ul className="grid gap-5">
            {h.languages.items.map((item) => (
              <li key={item.title} className="mk-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{fill(item.title, tokens)}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{fill(item.body, tokens)}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* S9 How it works */}
      <Section id={h.howItWorks.anchor} labelledBy="how-title" className="border-t border-border">
        <Head env={env} head={h.howItWorks} id="how-title" />
        <StepList lang={lang} steps={h.howItWorks.steps.map((s) => ({ title: fill(s.title, tokens), body: fill(s.body, tokens) }))} />
        <div className="mt-12">
          <Screenshot name="course-builder" lang={lang} alt={fill(h.howItWorks.steps[2]?.title ?? h.howItWorks.title, tokens)} caption={fill(h.howItWorks.steps[2]?.body ?? '', tokens)} demoLabel={demo} sizes="(min-width: 1200px) 1136px, 100vw" />
        </div>
      </Section>

      {/* S10 Fit */}
      <Section labelledBy="fit-title" className="border-t border-border">
        <Head env={env} head={h.fit} id="fit-title" />
        <FitColumns
          fitTitle={fill(h.fit.goodTitle, tokens)}
          fit={h.fit.good.map((line) => fill(line, tokens))}
          notYetTitle={fill(h.fit.notYetTitle, tokens)}
          notYet={h.fit.notYet.map((line) => fill(line, tokens))}
        />
        <p className="mt-8">
          <a href={link(lang, h.fit.link, tokens).href} className="mk-btn-ghost font-semibold">
            {fill(h.fit.link.label, tokens)}
          </a>
        </p>
      </Section>

      {/* S11 Pricing teaser */}
      <Section id="pricing" labelledBy="pricing-title" className="border-t border-border">
        <Head env={env} head={h.pricingTeaser} id="pricing-title" />
        <PricingCards plans={env.ctx.plans} content={content} tokens={tokens} idPrefix="home-billing" />
        <p className="mt-8 text-center">
          <a href={link(lang, h.pricingTeaser.link, tokens).href} className="mk-btn-ghost font-semibold">
            {fill(h.pricingTeaser.link.label, tokens)}
          </a>
        </p>
      </Section>

      {/* S12 FAQ */}
      <Section id={h.faq.anchor} labelledBy="faq-title" className="border-t border-border">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <Head env={env} head={h.faq} id="faq-title" />
          <Faq items={h.faq.items.map((qa) => ({ question: fill(qa.question, tokens), answer: fill(qa.answer, tokens) }))} />
        </div>
      </Section>

      {/* S13 Assisted setup */}
      <Section labelledBy="assisted-title" className="border-t border-border">
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-border p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5">
            <AtlasMark className="hidden size-12 shrink-0 text-brand-gold sm:block" />
            <div>
              <h2 id="assisted-title" className="mk-heading text-2xl font-semibold text-foreground sm:text-3xl">
                {fill(h.assisted.title, tokens)}
              </h2>
              {h.assisted.lead ? <p className="mt-3 max-w-[60ch] leading-relaxed text-muted-foreground">{fill(h.assisted.lead, tokens)}</p> : null}
            </div>
          </div>
          <a href={link(lang, h.assisted.cta, tokens).href} className="mk-btn mk-btn-secondary shrink-0">
            {fill(h.assisted.cta.label, tokens)}
          </a>
        </div>
      </Section>

      {/* S14 Closing */}
      <CtaBand
        title={fill(closing.title, tokens)}
        body={closing.lead ? fill(closing.lead, tokens) : undefined}
        microcopy={closingMicro}
        primary={link(lang, closing.primaryCta, tokens)}
        secondary={closing.secondaryCta ? link(lang, closing.secondaryCta, tokens) : undefined}
        dir={dir}
      />
    </Shell>
  );
}

function homePage(lang: MarketingLang): MarketingPageDef {
  return {
    id: 'home',
    lang,
    path: lang === 'ar' ? '/ar' : '/',
    file: lang === 'ar' ? 'ar/index.html' : 'index.html',
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      const faq = env.content.home.faq.items.map((qa) => ({
        question: fill(qa.question, env.tokens),
        answer: fill(qa.answer, env.tokens),
      }));
      return seoHead(env, 'home', '/', [
        ...entityGraph(env),
        webPage(env, '/', fill(env.content.seo.home.ogTitle, env.tokens)),
        faqPage(env, faq),
      ]);
    },
    render: (ctx) => <HomePage env={pageEnv(lang, ctx)} />,
  };
}

export const HOME_PAGES = [homePage('en'), homePage('ar')] as const;
