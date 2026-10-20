/**
 * Security `/security`, About `/about` and Contact `/contact` (+ `/ar/*`).
 * SPEC §B.5: plain-language security with "what we don't offer yet"; a short
 * about page with no invented team or milestones; the contact form posting
 * to `POST /api/v1/public/contact` (contract unchanged), wired by
 * `client/main.ts`.
 */
import type { ReactElement, ReactNode } from 'react';
import { Check, CheckCircle2, Minus } from 'lucide-react';
import { Container, CtaBand, Section, SectionHeading, dirOf } from '../components/ui';
import { CONTACT_LIMITS, CONTACT_TOPICS } from '../client/contact-validation';
import { canFill, fill, link } from '../lib/copy';
import { localePath } from '../lib/site';
import type { MkSectionHead } from '../content/content.types';
import type { MarketingLang, MarketingPageDef } from '../types';
import { Shell, breadcrumb, orgId, pageEnv, seoHead, webPage, type PageEnv } from './shared';

function PageHero({ env, head, id }: { env: PageEnv; head: MkSectionHead; id: string }) {
  return (
    <section className="relative overflow-hidden border-b border-border" aria-labelledby={id}>
      <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
      <Container className="relative py-14 lg:py-20">
        <SectionHeading
          id={id}
          level={1}
          eyebrow={head.eyebrow ? fill(head.eyebrow, env.tokens) : undefined}
          title={fill(head.title, env.tokens)}
          lead={head.lead ? fill(head.lead, env.tokens) : undefined}
        />
      </Container>
    </section>
  );
}

// ─── Security ───────────────────────────────────────────────────────────────

function SecurityPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const s = content.security;
  return (
    <Shell env={env} path="/security" currentId="security">
      <PageHero env={env} head={s.hero} id="security-title" />
      {s.sections.map((section, index) => (
        <Section
          key={section.anchor ?? section.title}
          id={section.anchor}
          labelledBy={`${section.anchor ?? index}-title`}
          className={index > 0 ? 'border-t border-border' : undefined}
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <SectionHeading
              id={`${section.anchor ?? index}-title`}
              title={fill(section.title, tokens)}
              lead={section.lead ? fill(section.lead, tokens) : undefined}
            />
            <ul className="grid gap-4">
              {section.items.map((item) => (
                <li key={item.title} className="mk-card p-5">
                  <h3 className="font-semibold text-foreground">{fill(item.title, tokens)}</h3>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{fill(item.body, tokens)}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ))}

      <Section id={s.notYet.anchor} labelledBy="not-yet-title" className="border-t border-border">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-10">
          <SectionHeading id="not-yet-title" title={fill(s.notYet.title, tokens)} lead={s.notYet.lead ? fill(s.notYet.lead, tokens) : undefined} />
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {s.notYet.items.map((item) => (
              <li key={item} className="flex gap-3 text-muted-foreground">
                <Minus className="mt-1 size-4 shrink-0" aria-hidden strokeWidth={2.25} />
                <span className="leading-relaxed">{fill(item, tokens)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id={s.requests.anchor} labelledBy="requests-title" className="border-t border-border">
        <h2 id="requests-title" className="mk-heading text-2xl font-semibold text-foreground sm:text-3xl">
          {fill(s.requests.title, tokens)}
        </h2>
        <p className="mt-4 max-w-[64ch] leading-relaxed text-muted-foreground">{fill(s.requests.body, tokens)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={link(lang, s.requests.cta, tokens).href} className="mk-btn mk-btn-secondary">
            {fill(s.requests.cta.label, tokens)}
          </a>
          <a href={link(lang, s.requests.privacyLink, tokens).href} className="mk-btn mk-btn-ghost">
            {fill(s.requests.privacyLink.label, tokens)}
          </a>
        </div>
      </Section>

      <CtaBand
        title={fill(s.closing.title, tokens)}
        body={s.closing.lead ? fill(s.closing.lead, tokens) : undefined}
        primary={link(lang, s.closing.primaryCta, tokens)}
        secondary={s.closing.secondaryCta ? link(lang, s.closing.secondaryCta, tokens) : undefined}
        dir={dirOf(lang)}
      />
    </Shell>
  );
}

// ─── About ──────────────────────────────────────────────────────────────────

function AboutPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const a = content.about;
  const micro = a.closing.microcopy && canFill(a.closing.microcopy, tokens) ? fill(a.closing.microcopy, tokens) : undefined;
  return (
    <Shell env={env} path="/about" currentId="about">
      <PageHero env={env} head={a.hero} id="about-title" />
      <Section labelledBy="story-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <h2 id="story-title" className="mk-heading text-3xl font-semibold text-foreground sm:text-4xl">
            {fill(a.story.title, tokens)}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-foreground/90">
            {a.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{fill(paragraph, tokens)}</p>
            ))}
          </div>
        </div>
      </Section>
      {[a.audience, a.principles].map((block, index) => (
        <Section key={block.title} labelledBy={`about-block-${index}`} className="border-t border-border">
          <SectionHeading id={`about-block-${index}`} title={fill(block.title, tokens)} lead={block.lead ? fill(block.lead, tokens) : undefined} />
          <ul className={`mt-10 grid gap-5 sm:grid-cols-2 ${block.items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
            {block.items.map((item) => (
              <li key={item.title} className="mk-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{fill(item.title, tokens)}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{fill(item.body, tokens)}</p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
      <Section labelledBy="reach-title" className="border-t border-border">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="reach-title" className="mk-heading text-2xl font-semibold text-foreground sm:text-3xl">
              {fill(a.reach.title, tokens)}
            </h2>
            <p className="mt-3 max-w-[60ch] leading-relaxed text-muted-foreground">{fill(a.reach.body, tokens)}</p>
          </div>
          <a href={link(lang, a.reach.cta, tokens).href} className="mk-btn mk-btn-secondary shrink-0">
            {fill(a.reach.cta.label, tokens)}
          </a>
        </div>
      </Section>
      <CtaBand
        title={fill(a.closing.title, tokens)}
        body={a.closing.lead ? fill(a.closing.lead, tokens) : micro}
        primary={link(lang, a.closing.primaryCta, tokens)}
        secondary={a.closing.secondaryCta ? link(lang, a.closing.secondaryCta, tokens) : undefined}
        dir={dirOf(lang)}
      />
    </Shell>
  );
}

// ─── Contact ────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  hint,
  children,
  optional,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div data-optional={optional ? 'true' : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <p id={`${id}-error`} data-field-error={id.replace('contact-', '')} className="mt-1.5 text-sm font-medium text-destructive" hidden />
    </div>
  );
}

function ContactPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const c = content.contact;
  const limits = { ...tokens, ...CONTACT_LIMITS };
  const e = c.errors;
  /** Error copy by validator code, read by client/main.ts from data-err<Code>. */
  const errorData: Record<string, string> = {
    'data-err-name-required': e.nameRequired,
    'data-err-name-too-short': e.nameTooShort,
    'data-err-name-too-long': e.nameTooLong,
    'data-err-email-required': e.emailRequired,
    'data-err-email-invalid': e.emailInvalid,
    'data-err-email-too-long': e.emailTooLong,
    'data-err-organization-too-long': e.organizationTooLong,
    'data-err-topic-invalid': e.topicRequired,
    'data-err-message-required': e.messageRequired,
    'data-err-message-too-short': e.messageTooShort,
    'data-err-message-too-long': e.messageTooLong,
    'data-err-generic': e.summary,
  };
  const data = Object.fromEntries(Object.entries(errorData).map(([k, v]) => [k, fill(v, limits)]));
  return (
    <Shell env={env} path="/contact" currentId="contact">
      <PageHero env={env} head={c.hero} id="contact-title" />
      <Section labelledBy="contact-form-title">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="mk-card p-6 sm:p-8">
            <h2 id="contact-form-title" className="sr-only">
              {fill(c.form.label, tokens)}
            </h2>
            <div data-contact-success hidden tabIndex={-1} className="flex gap-4" role="status">
              <CheckCircle2 className="size-8 shrink-0 text-success" aria-hidden strokeWidth={1.75} />
              <div>
                <p className="text-xl font-semibold text-foreground">{fill(c.success.title, tokens)}</p>
                <p className="mt-2 leading-relaxed text-muted-foreground">{fill(c.success.body, tokens)}</p>
              </div>
            </div>
            <form
              data-contact-form
              noValidate
              aria-labelledby="contact-form-title"
              className="space-y-5"
              data-sending={fill(c.form.submitting, tokens)}
              data-send-failed={`${fill(c.failure.title, tokens)}. ${fill(c.failure.body, tokens)}`}
              data-rate-limited={fill(c.failure.rateLimited, tokens)}
              {...data}
            >
              <div data-error-summary hidden tabIndex={-1} role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <p className="font-semibold text-destructive">{fill(e.summary, tokens)}</p>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm" />
              </div>
              <p className="text-sm text-muted-foreground">{fill(c.form.requiredNote, tokens)}</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-name" label={fill(c.form.name, tokens)}>
                  <input id="contact-name" name="name" type="text" autoComplete="name" required maxLength={CONTACT_LIMITS.nameMax} aria-describedby="contact-name-error" className="mk-field" />
                </Field>
                <Field id="contact-email" label={fill(c.form.email, tokens)} hint={fill(c.form.emailHint, tokens)}>
                  <input id="contact-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={CONTACT_LIMITS.emailMax} aria-describedby="contact-email-hint contact-email-error" className="mk-field" dir="ltr" />
                </Field>
              </div>
              <Field id="contact-organizationName" label={fill(c.form.organization, tokens)} optional>
                <input id="contact-organizationName" name="organizationName" type="text" autoComplete="organization" maxLength={CONTACT_LIMITS.organizationMax} aria-describedby="contact-organizationName-error" className="mk-field" />
              </Field>
              <Field id="contact-topic" label={fill(c.form.topic, tokens)}>
                <select id="contact-topic" name="topic" required defaultValue="sales" aria-describedby="contact-topic-error" className="mk-field">
                  {CONTACT_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {fill(c.topics[topic], tokens)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="contact-message" label={fill(c.form.message, tokens)} hint={fill(c.form.messageHint, tokens)}>
                <textarea id="contact-message" name="message" rows={6} required maxLength={CONTACT_LIMITS.messageMax} aria-describedby="contact-message-hint contact-message-error" className="mk-field" />
              </Field>
              {/* Honeypot: hidden from people and assistive tech. */}
              <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="contact-company">Company</label>
                <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button type="submit" className="mk-btn mk-btn-primary">
                  {fill(c.form.submit, tokens)}
                </button>
                <p data-form-status role="status" aria-live="polite" className="text-sm text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{fill(c.points.privacy, tokens)}</p>
              <noscript>
                <p className="rounded-lg border border-border bg-surface p-3 text-sm">{fill(c.form.noScript, tokens)}</p>
              </noscript>
            </form>
          </div>
          <aside aria-labelledby="contact-aside-title">
            <h2 id="contact-aside-title" className="text-lg font-semibold text-foreground">
              {fill(c.aside.title, tokens)}
            </h2>
            <ul className="mt-4 space-y-3">
              {c.aside.links.map((item) => {
                const resolved = link(lang, item, tokens);
                return (
                  <li key={item.label}>
                    <a href={resolved.href} className="flex items-center gap-2 font-medium text-primary hover:underline">
                      <Check className="size-4" aria-hidden strokeWidth={2.25} />
                      {resolved.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </Section>
    </Shell>
  );
}

// ─── Page defs ──────────────────────────────────────────────────────────────

function def(
  id: 'security' | 'about' | 'contact',
  lang: MarketingLang,
  Component: (props: { env: PageEnv }) => ReactElement,
  extraLd?: (env: PageEnv) => object[],
): MarketingPageDef {
  const path = `/${id}`;
  return {
    id,
    lang,
    path: localePath(lang, path),
    file: lang === 'ar' ? `ar/${id}/index.html` : `${id}/index.html`,
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      const name = fill(env.content.seo[id].ogTitle, env.tokens);
      const type = id === 'about' ? 'AboutPage' : id === 'contact' ? 'ContactPage' : 'WebPage';
      return seoHead(env, id, path, [
        webPage(env, path, name, type),
        breadcrumb(env, [{ name, path }]),
        ...(extraLd ? extraLd(env) : []),
      ]);
    },
    render: (ctx) => <Component env={pageEnv(lang, ctx)} />,
  };
}

const aboutLd = (env: PageEnv): object[] => [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId(env.ctx.siteUrl),
    name: env.content.brand.name,
    alternateName: env.content.brand.otherName,
    url: `${env.ctx.siteUrl}/`,
    description: fill(env.content.jsonLd.organizationDescription, env.tokens),
  },
];

export const COMPANY_PAGES = (['en', 'ar'] as const).flatMap((lang) => [
  def('security', lang, SecurityPage),
  def('about', lang, AboutPage, aboutLd),
  def('contact', lang, ContactPage),
]);
