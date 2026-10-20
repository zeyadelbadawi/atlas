/**
 * Fixture pages and assets for the prerender's unit tests: the pipeline
 * must work with any registry (empty included), so the tests do not depend
 * on the real pages' copy.
 */
import type { Plan } from '@/types/plan.types';
import type { MarketingPageDef, MarketingRenderContext } from '../types';
import type { MarketingAssets } from './document';

export const FIXTURE_ASSETS: MarketingAssets = {
  stylesheets: ['/assets/marketing-abc123.css'],
  moduleScripts: ['/assets/marketing-def456.js'],
  modulePreloads: [],
  themeScript: '/assets/marketing-theme-0011aabb.js',
  fontPreloads: {
    en: [
      '/assets/readex-pro-latin-AAAAAAAA.woff2',
      '/assets/rubik-latin-BBBBBBBB.woff2',
    ],
    ar: [
      '/assets/readex-pro-arabic-CCCCCCCC.woff2',
      '/assets/rubik-arabic-DDDDDDDD.woff2',
    ],
  },
};

export const FIXTURE_PLANS: Plan[] = [
  {
    id: 'p2',
    key: 'growth',
    name: 'Academy',
    nameLocalized: { en: 'Academy', ar: 'الأكاديمية' },
    description: 'For a small team | one brand.',
    status: 'active',
    displayOrder: 2,
    family: 'normal',
    limits: {
      academies: 1,
      students: 400,
      instructors: 8,
      staff: 8,
      courses: 'unlimited',
      generalStorage: 30,
      videoStorage: 75,
      recordedSessions: 10,
    },
    features: { liveSessions: false },
    pricing: {
      amount: 2790,
      currency: 'EGP',
      billingCycle: 'monthly',
      yearlyAmount: 27900,
    },
    trialEligible: true,
    trialDurationDays: 14,
    version: 1,
  },
  {
    id: 'p1',
    key: 'starter',
    name: 'Teacher',
    status: 'active',
    displayOrder: 1,
    limits: {
      academies: 1,
      students: 100,
      instructors: 3,
      staff: 3,
      courses: 20,
      generalStorage: 10,
      videoStorage: 30,
      recordedSessions: 3,
    },
    features: { liveSessions: false },
    pricing: { amount: 1190, currency: 'EGP', billingCycle: 'monthly' },
    trialEligible: false,
    version: 1,
  },
  {
    id: 'p0',
    key: 'legacy',
    name: 'Legacy',
    status: 'archived',
    displayOrder: 0,
    limits: {
      academies: 1,
      students: 1,
      instructors: 1,
      staff: 1,
      courses: 1,
      generalStorage: 1,
      videoStorage: 1,
      recordedSessions: 1,
    },
    features: { liveSessions: false },
    trialEligible: false,
    version: 1,
  },
];

export const FIXTURE_CTX: MarketingRenderContext = {
  plans: FIXTURE_PLANS,
  siteUrl: 'https://atlass.dpdns.org',
  buildDate: '2026-10-20',
};

function page(
  id: string,
  lang: 'en' | 'ar',
  path: string,
  options: {
    file?: string;
    inSitemap?: boolean;
    noindex?: boolean;
    h1?: string;
  } = {}
): MarketingPageDef {
  const en = path.replace(/^\/ar(?=\/|$)/, '') || '/';
  const ar = en === '/' ? '/ar' : `/ar${en}`;
  const h1 = options.h1 ?? `${id} heading ${lang}`;
  return {
    id,
    lang,
    path,
    file:
      options.file ??
      (path === '/' ? 'index.html' : `${path.slice(1)}/index.html`),
    inSitemap: options.inSitemap ?? true,
    head: () => ({
      title: `${id} title ${lang} | ${lang === 'ar' ? 'أطلس' : 'Atlas'}`,
      description: `${id} description ${lang}`,
      canonicalPath: path,
      alternates: options.noindex ? undefined : { en, ar },
      ogImage: `/marketing-assets/og/og-${lang}.jpg`,
      robots: options.noindex ? 'noindex, follow' : undefined,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${id} </script> ${lang}`,
        },
      ],
    }),
    render: () => (
      <div>
        <header>
          <nav>
            <a href="/">Header nav link</a>
          </nav>
        </header>
        <main id="main">
          <h1>{h1}</h1>
          <p>
            Body of {id} &amp; more.
            <svg aria-hidden="true">
              <title>icon</title>
            </svg>
          </p>
          <ul>
            <li>First point</li>
            <li>Second point</li>
          </ul>
          <span aria-hidden="true">decorative</span>
          <a href="/auth/register">Start</a>
          <a href="/contact">Talk to us</a>
        </main>
        <footer>Footer text</footer>
      </div>
    ),
  };
}

export const FIXTURE_PAGES: MarketingPageDef[] = [
  page('home', 'en', '/'),
  page('home', 'ar', '/ar'),
  page('pricing', 'en', '/pricing'),
  page('pricing', 'ar', '/ar/pricing'),
  page('notFound', 'en', '/404', {
    file: '404.html',
    inSitemap: false,
    noindex: true,
  }),
  page('notFound', 'ar', '/ar/404', {
    file: 'ar/404.html',
    inSitemap: false,
    noindex: true,
  }),
];
