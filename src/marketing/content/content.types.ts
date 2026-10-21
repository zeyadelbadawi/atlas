/**
 * Copy tree for the static platform marketing site (B1 / M1a).
 *
 * One `MarketingContent` object per language (`en.ts`, `ar.ts`). Components
 * read sections from here and never hold their own strings.
 *
 * TOKENS. Strings may carry `{name}` tokens that the renderer fills at build
 * time. Nothing commercial is ever written into the copy itself: prices,
 * trial length, limits and plan names come from `GET /api/v1/public/plans`.
 *
 *   {brand}              brand name in the page language ("Atlas" / «أطلس»).
 *                        Copy is rename-ready: the name never appears literally.
 *   {trialDays}          catalog `trialDurationDays`, formatted number only.
 *   {trialDuration}      `plurals.days` filled with `trialDurationDays`
 *                        (EN "14 days", AR «١٤ يومًا»). Arabic copy uses this,
 *                        never "{trialDays} أيام", so number agreement holds.
 *   {planName}           `nameLocalized[lang]` of the plan in context.
 *   {topPlanName}        name of the self-serve plan with the highest limits.
 *   {price}              monthly price, formatted `en-US` / `ar-EG` with EGP.
 *   {yearlyPrice}        yearly price, same formatting.
 *   {monthlyEquivalent}  yearlyPrice / 12, same formatting.
 *   {saving}             12 × monthly − yearly, same formatting.
 *   {paidMonthsCount}    `plurals.months` filled with yearly / monthly (only
 *                        when that is a whole number; otherwise use the
 *                        `yearlySaving` string).
 *   {students} {academies} {instructors} {courses}
 *                        the plural phrase for that limit (e.g. "400 students",
 *                        «٤٠٠ طالب»), or the matching `unlimited` phrase.
 *   {maxStudents} {maxAcademies}
 *                        plural phrase for the highest self-serve limit.
 *   {giftedDuration}     `plurals.days` filled with `giftedDaysYearly` (or
 *                        `giftedDaysMonthly`). Render the line only when set.
 *   {count} {max}        plural forms and counters.
 *   {nameMin} {nameMax} {emailMax} {organizationMax} {messageMin} {messageMax}
 *                        contact-form validation limits.
 *   {date} {year}        formatted in the page locale.
 *
 * DIGITS. Arabic pages format every number with `ar-EG` (Arabic-Indic
 * digits) and never mix digit systems on a page. Counts inside Arabic prose
 * are written as words.
 *
 * HREFS. `href` values are language-neutral paths (`/pricing`,
 * `/contact?topic=sales`, `#payments`). The renderer adds the `/ar` prefix on
 * Arabic pages, and `?plan=<key>&lang=ar` plus UTM pass-through on
 * `/auth/register`. App paths (`/auth/*`, `/dashboard`) are never prefixed.
 * `help:/selling/payment-methods` is that help-center page (docs host, same
 * language); the path must be a page of src/docs/inventory.json.
 *
 * CLAIMS. `claim` carries the feature ID(s) behind a statement (claims
 * register, SPEC A.11). The build may hide an item whose claim is gated.
 */
import type { PlanLimitKey } from '@/types/plan.types';

export type MarketingPageId =
  | 'home'
  | 'features'
  | 'pricing'
  | 'security'
  | 'about'
  | 'contact'
  | 'notFound';

/** Keys of the catalog plans the copy knows about (`GET /public/plans`). */
export type MarketingPlanKey = 'starter' | 'growth' | 'enterprise';

/** Contact topics accepted by `POST /api/v1/public/contact` in B1. */
export type MarketingContactTopic = 'sales' | 'support' | 'partnership' | 'other';

/** The five product pages that are planned (DL-37). Never linked in B1. */
export type MarketingPlannedPageId =
  | 'academy-website'
  | 'payments'
  | 'content-protection'
  | 'teams-and-academies'
  | 'quizzes-and-certificates';

/**
 * `Intl.PluralRules` categories. `{count}` is the formatted number.
 * English needs `one` and `other`; Arabic fills all six.
 */
export interface MkPlural {
  readonly zero?: string;
  readonly one: string;
  readonly two?: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
}

export interface MkLink {
  readonly label: string;
  readonly href: string;
  /** Accessible name when the visible label is short or ambiguous. */
  readonly ariaLabel?: string;
  /**
   * A trial CTA's stand-in for a visitor with the `atlas_signed_in` hint: a
   * short dashboard action for the same section (the page renders both and
   * the stylesheet shows one). `href` is a dashboard path.
   */
  readonly signedIn?: { readonly label: string; readonly href: string };
}

export interface MkItem {
  readonly title: string;
  readonly body: string;
  readonly claim?: string;
}

/** A short statement with an optional lucide icon name for the component. */
export interface MkFact {
  readonly text: string;
  readonly icon?: string;
  readonly claim?: string;
}

export interface MkQa {
  readonly question: string;
  /** Direct answer first, ≤ 80 words. Also used verbatim in FAQPage JSON-LD. */
  readonly answer: string;
  readonly claim?: string;
}

/** Common head of a page section. `lead` is the 40–60-word quotable answer. */
export interface MkSectionHead {
  readonly eyebrow?: string;
  readonly title: string;
  readonly lead?: string;
  /** In-page anchor without `#`, e.g. `payments`. */
  readonly anchor?: string;
}

export interface MkSectionWithItems extends MkSectionHead {
  readonly items: readonly MkItem[];
  /** The help-center article that explains this in detail (`help:/…`). */
  readonly learnMore?: MkLink;
}

export interface MkFaqSection extends MkSectionHead {
  readonly items: readonly MkQa[];
}

/** A closing band: title, body and the two standard CTAs. */
export interface MkClosing {
  readonly title: string;
  readonly lead?: string;
  /** Trial line under the buttons; render only when the catalog has a trial. */
  readonly microcopy?: string;
  readonly primaryCta: MkLink;
  readonly secondaryCta?: MkLink;
}

export interface MkPageSeo {
  /** `<title>`, ≤ 60 characters after tokens are filled. */
  readonly title: string;
  /** Meta description, ≤ 155 characters after tokens are filled. */
  readonly description: string;
  /** `og:title` (the title without the brand suffix). */
  readonly ogTitle: string;
  readonly ogImageAlt: string;
}

export interface MkPlannedPage {
  readonly id: MarketingPlannedPageId;
  readonly label: string;
  readonly description: string;
}

// ─── Global chrome ──────────────────────────────────────────────────────────

export interface MkChrome {
  readonly skipToContent: string;
  readonly header: {
    readonly navLabel: string;
    readonly homeLabel: string;
    readonly product: string;
    readonly productOverview: { readonly label: string; readonly description: string };
    readonly pricing: string;
    readonly security: string;
    readonly contact: string;
    readonly about: string;
    /** The help center (its own host). */
    readonly help: string;
    readonly menuOpen: string;
    readonly menuClose: string;
    readonly menuLabel: string;
  };
  /** Label shown beside every planned page; the item is not a link. */
  readonly plannedBadge: string;
  readonly plannedPages: readonly MkPlannedPage[];
  /** The link to the OTHER language. Its text is in that language. */
  readonly languageSwitch: {
    readonly targetLang: 'en' | 'ar';
    readonly targetName: string;
    readonly targetShort: string;
    readonly targetAccessibleName: string;
    /** Footer column title, in the page language. */
    readonly columnTitle: string;
    /**
     * Client-only suggestion bar, written in the TARGET language because it
     * is shown to visitors whose browser prefers that language.
     */
    readonly suggestion: {
      readonly regionLabel: string;
      readonly text: string;
      readonly action: string;
      readonly dismiss: string;
    };
  };
  readonly theme: {
    readonly label: string;
    readonly light: string;
    readonly dark: string;
    readonly system: string;
  };
  readonly ctas: {
    /** CTA-T, every page. Target `/auth/register`. */
    readonly trial: MkLink;
    /** Compact CTA-T for the mobile header bar. */
    readonly trialShort: MkLink;
    /** CTA-T variant naming the trial length. */
    readonly trialWithDays: MkLink;
    /** CTA-C. Target `/contact?topic=sales`. */
    readonly assisted: MkLink;
    readonly seePricing: MkLink;
    readonly signIn: MkLink;
    readonly talkToUs: MkLink;
    /** Replaces Sign in when the `atlas_signed_in` hint says a dashboard session exists (DL-63). */
    readonly goToDashboard: MkLink;
    /** Compact "Open dashboard" for the mobile header bar (DL-63). */
    readonly goToDashboardShort: MkLink;
    /** The pricing cards' trial button, for a signed-in visitor: their subscription page. */
    readonly managePlan: MkLink;
  };
  /** DL-63 — the full-screen transition shown while a link opens the dashboard host. */
  readonly appHandoff: {
    readonly dashboard: string;
    readonly signIn: string;
    readonly signUp: string;
  };
  /** Standard trial microcopy under CTA-T. Omit when the catalog has no trial. */
  readonly trialMicrocopy: string;
  readonly stickyCta: { readonly regionLabel: string };
  readonly footer: {
    readonly label: string;
    readonly blurb: string;
    readonly columns: readonly {
      readonly title: string;
      readonly links: readonly MkLink[];
      /** Product topics listed in this column, linked to their sections on the product overview page. */
      readonly planned?: boolean;
    }[];
    /** Render only if a consent dialog exists on the marketing host. */
    readonly cookiePreferences: string;
    /** Until the legal entity is confirmed (B0-OC-17) this names the brand only. */
    readonly copyright: string;
  };
  readonly breadcrumbs: { readonly home: string; readonly product: string };
  /** Caption chip on every screenshot. */
  readonly demoLabel: string;
  readonly media: {
    readonly heroScreenshotAlt: string;
  };
}

// ─── Home ───────────────────────────────────────────────────────────────────

export interface MkHome {
  readonly hero: {
    readonly eyebrow: string;
    /** The page's only H1. */
    readonly title: string;
    readonly lead: string;
    readonly primaryCta: MkLink;
    readonly secondaryCta: MkLink;
    readonly microcopy: string;
  };
  /** S2. Exactly four facts, no CTA. */
  readonly facts: { readonly label: string; readonly items: readonly MkFact[] };
  /** S3. */
  readonly routine: MkSectionWithItems & { readonly link: MkLink };
  /** S4, anchor `payments`. */
  readonly payments: MkSectionHead & {
    readonly steps: readonly MkItem[];
    readonly points: readonly string[];
    /** Required disclosure, body size, in the no-JS HTML. */
    readonly disclosure: string;
    readonly cta: MkLink;
  };
  /** S6, anchor `website`. */
  readonly website: MkSectionWithItems;
  /** S7, anchor `team`. */
  readonly team: MkSectionWithItems & {
    readonly moreAcademies: { readonly title: string; readonly body: string };
    readonly cta: MkLink;
  };
  /** S8, anchor `assessments`. The demo-certificate link stays hidden (OC-29). */
  readonly assessments: MkSectionWithItems;
  /** Students and reports. */
  readonly students: MkSectionWithItems;
  /** Arabic and English. */
  readonly languages: MkSectionWithItems;
  /** S9, rendered as an `<ol>`. */
  readonly howItWorks: MkSectionHead & { readonly steps: readonly MkItem[] };
  /** S10. */
  readonly fit: MkSectionHead & {
    readonly goodTitle: string;
    readonly good: readonly string[];
    readonly notYetTitle: string;
    readonly notYet: readonly string[];
    readonly link: MkLink;
  };
  /** S11. Cards come from the catalog and reuse `pricing.card`. */
  readonly pricingTeaser: MkSectionHead & { readonly link: MkLink };
  /** S12. */
  readonly faq: MkFaqSection;
  /** S13. */
  readonly assisted: MkSectionHead & { readonly cta: MkLink };
  /** S14, the only tinted block. */
  readonly closing: MkClosing;
}

// ─── Features hub ───────────────────────────────────────────────────────────

export interface MkFeatureGroup extends MkSectionHead {
  readonly id: string;
  readonly points: readonly string[];
  /** Honest limit shown under the points, when the group has one. */
  readonly note?: string;
  /** Claim IDs covered by this group. */
  readonly claim?: string;
  /** The help-center article that explains this in detail (`help:/…`). */
  readonly learnMore?: MkLink;
}

export interface MkFeatures {
  readonly hero: MkSectionHead & {
    readonly primaryCta: MkLink;
    readonly secondaryCta: MkLink;
  };
  readonly groups: readonly MkFeatureGroup[];
  /** Uses `chrome.plannedPages` and `chrome.plannedBadge`. */
  readonly planned: MkSectionHead;
  readonly closing: MkClosing;
}

// ─── Pricing ────────────────────────────────────────────────────────────────

export type MkLimitRowKey = Extract<
  PlanLimitKey,
  'students' | 'academies' | 'instructors' | 'courses' | 'generalStorage'
> | 'monthlyEmails';

export interface MkPricing {
  readonly hero: MkSectionHead;
  readonly billingToggle: {
    readonly label: string;
    readonly monthly: string;
    readonly yearly: string;
    /** When yearly = N × monthly with whole N. */
    readonly yearlyNote: string;
    /** Fallback when N is not whole. */
    readonly yearlySaving: string;
  };
  readonly card: {
    readonly perMonth: string;
    readonly perYear: string;
    readonly yearlyEquivalent: string;
    readonly recommendedBadge: string;
    readonly trialLine: string;
    readonly noTrialLine: string;
    readonly ctaTrial: string;
    readonly ctaTalk: string;
    readonly limitsHeading: string;
    /** Shown instead of a price when the catalog has none. Never invent one. */
    readonly priceUnavailable: string;
  };
  /** Per catalog key. `audience` is the one-line "who it's for". */
  readonly plans: Readonly<
    Record<MarketingPlanKey, { readonly audience: string; readonly recommended: boolean }>
  >;
  /** The "talk to us" card for needs above the top plan. No price, no `Offer`. */
  readonly larger: {
    readonly title: string;
    readonly body: string;
    readonly points: readonly string[];
    readonly cta: MkLink;
  };
  readonly includedInEvery: { readonly title: string; readonly items: readonly string[] };
  readonly limitsTable: {
    readonly title: string;
    readonly caption: string;
    readonly scrollHint: string;
    readonly limitColumn: string;
    readonly rows: readonly { readonly key: MkLimitRowKey; readonly label: string; readonly hint?: string }[];
    readonly unlimited: string;
    /** `{count}` = formatted GB. */
    readonly storageValue: string;
    /** `{count}` = formatted emails per academy per month. */
    readonly emailsValue: string;
    /** When the plan does not set the value. */
    readonly notSet: string;
  };
  /**
   * Labels for catalog limits that MUST NOT render in B1 (SPEC §C
   * "Forbidden": staff and recordedSessions limits, hosted-video storage and
   * minutes, add-ons). Kept so a component can map every catalog key; a test
   * should assert none of these appears in the rendered pricing HTML.
   */
  readonly withheldLimitLabels: {
    readonly staff: string;
    readonly videoStorage: string;
    readonly videoMinutes: string;
    readonly recordedSessions: string;
    readonly liveSessionsAddOn: string;
  };
  readonly trial: MkSectionHead & {
    readonly items: readonly string[];
    /** Render only when the plan sets `giftedDaysYearly`. */
    readonly giftedYearly: string;
    /** Render only when the plan sets `giftedDaysMonthly`. */
    readonly giftedMonthly: string;
  };
  readonly payingAtlas: MkSectionHead & { readonly items: readonly string[] };
  readonly changes: MkSectionWithItems & { readonly termsLink: MkLink };
  /** "What's included and what isn't". Required in both languages. */
  readonly honestLimits: MkSectionHead & {
    readonly includedTitle: string;
    readonly included: readonly string[];
    readonly notYetTitle: string;
    readonly notYet: readonly string[];
  };
  readonly faq: MkFaqSection;
  readonly pricesUpdated: string;
  readonly currencyNote: string;
  readonly closing: MkClosing;
}

// ─── Security, About, Contact, 404 ──────────────────────────────────────────

export interface MkSecurity {
  readonly hero: MkSectionHead;
  readonly sections: readonly MkSectionWithItems[];
  readonly notYet: MkSectionHead & { readonly items: readonly string[] };
  readonly requests: MkSectionHead & {
    readonly body: string;
    readonly cta: MkLink;
    readonly privacyLink: MkLink;
  };
  readonly closing: MkClosing;
}

export interface MkAbout {
  readonly hero: MkSectionHead;
  readonly story: { readonly title: string; readonly paragraphs: readonly string[] };
  readonly audience: MkSectionWithItems;
  readonly principles: MkSectionWithItems;
  readonly reach: MkSectionHead & { readonly body: string; readonly cta: MkLink };
  readonly closing: MkClosing;
}

export interface MkContact {
  readonly hero: MkSectionHead;
  readonly points: {
    readonly privacy: string;
    /** Used instead of `privacy` when the consent boxes are shown. */
    readonly privacyWithConsent: string;
  };
  readonly aside: { readonly title: string; readonly links: readonly MkLink[] };
  readonly form: {
    readonly label: string;
    readonly name: string;
    readonly email: string;
    readonly emailHint: string;
    readonly organization: string;
    readonly topic: string;
    readonly topicPlaceholder: string;
    readonly message: string;
    readonly messageHint: string;
    readonly messageCount: string;
    readonly whatsapp: string;
    readonly whatsappHint: string;
    readonly consentLegend: string;
    readonly submit: string;
    readonly submitting: string;
    readonly requiredNote: string;
    readonly noScript: string;
  };
  readonly topics: Readonly<Record<MarketingContactTopic, string>>;
  /** Two separate boxes, both unticked by default. */
  readonly consent: { readonly contact: string; readonly marketing: string };
  readonly errors: {
    readonly nameRequired: string;
    readonly nameTooShort: string;
    readonly nameTooLong: string;
    readonly emailRequired: string;
    readonly emailInvalid: string;
    readonly emailTooLong: string;
    readonly organizationTooLong: string;
    readonly topicRequired: string;
    readonly messageRequired: string;
    readonly messageTooShort: string;
    readonly messageTooLong: string;
    readonly whatsappInvalid: string;
    readonly summary: string;
  };
  /** One success state; focus moves to its title. */
  readonly success: { readonly title: string; readonly body: string; readonly again: string };
  readonly failure: { readonly title: string; readonly body: string; readonly rateLimited: string };
}

export interface MkNotFound {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  /** Shown too, since planned product URLs return this page. */
  readonly plannedHint: string;
  /** Home, pricing and contact only. */
  readonly links: readonly MkLink[];
}

// ─── Machine-readable text ──────────────────────────────────────────────────

export interface MkLlms {
  /** H1 of llms.txt. */
  readonly heading: string;
  /** 2–3 sentences, same meaning as the category statement. */
  readonly summary: string;
  /** Factual paragraph (~150 words in EN). */
  readonly details: string;
  readonly pagesTitle: string;
  readonly pageNotes: Readonly<Record<Exclude<MarketingPageId, 'notFound'>, string>>;
  readonly pricingFileNote: string;
  readonly crawlerPolicy: string;
}

export interface MkJsonLd {
  readonly organizationDescription: string;
  readonly softwareApplicationName: string;
  readonly softwareApplicationDescription: string;
  readonly websiteDescription: string;
}

// ─── Root ───────────────────────────────────────────────────────────────────

export interface MarketingContent {
  readonly lang: 'en' | 'ar';
  readonly dir: 'ltr' | 'rtl';
  /** BCP 47 tag for number and date formatting. */
  readonly numberLocale: 'en-US' | 'ar-EG';
  readonly brand: {
    readonly name: string;
    /** The brand in the other language (JSON-LD `alternateName`). */
    readonly otherName: string;
    readonly tagline: string;
    readonly categoryStatement: string;
  };
  readonly plurals: {
    readonly days: MkPlural;
    readonly months: MkPlural;
    readonly students: MkPlural;
    readonly academies: MkPlural;
    readonly instructors: MkPlural;
    readonly courses: MkPlural;
  };
  /** Phrases for `'unlimited'` limit values, keyed like `plurals`. */
  readonly unlimited: {
    readonly students: string;
    readonly academies: string;
    readonly instructors: string;
    readonly courses: string;
  };
  readonly chrome: MkChrome;
  readonly seo: Readonly<Record<MarketingPageId, MkPageSeo>>;
  readonly home: MkHome;
  readonly features: MkFeatures;
  readonly pricing: MkPricing;
  readonly security: MkSecurity;
  readonly about: MkAbout;
  readonly contact: MkContact;
  readonly notFound: MkNotFound;
  readonly llms: MkLlms;
  readonly jsonLd: MkJsonLd;
}
