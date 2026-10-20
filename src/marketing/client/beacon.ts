/**
 * The marketing website's COOKIELESS beacon (B1 SPEC F.5), sent to Atlas's
 * own API (`POST /api/v1/mkt/events`) and nowhere else. Built like RUM
 * (`src/lib/rum/rum.ts`):
 *
 *   - nothing is stored in the browser: no cookie, no localStorage, no
 *     sessionStorage, no identifier of any kind; requests go out with
 *     `credentials: 'omit'`;
 *   - a browser sending Global Privacy Control or Do Not Track gets
 *     NOTHING: no listener, no request;
 *   - every field is a closed vocabulary (mirroring the backend's
 *     `marketing-events.vocabulary.ts`, which is the authority): the page
 *     TEMPLATE from `<body data-mkt-page>`, the locale, mobile/desktop by the
 *     767 px rule, and a short value from a per-event list. Never a URL,
 *     path, query or fragment: UTM values are matched against the campaign
 *     register in memory (anything else is sent as `unregistered`), and the
 *     referrer is reduced to a bare hostname.
 *
 * The server stores daily aggregate counts only. Owner decision DL-51: no
 * consent prompt, like RUM; disclosed in the privacy policy (EN + AR).
 */

export const MKT_EVENTS_ENDPOINT = '/api/v1/mkt/events';
/** The batch is flushed when it reaches this many events (and on page hide). */
export const MKT_FLUSH_AT = 10;
const MAX_PER_REQUEST = 20;

const PAGES = [
  'mkt:home',
  'mkt:features',
  'mkt:pricing',
  'mkt:contact',
  'mkt:security',
  'mkt:about',
  'mkt:legal',
  'mkt:404',
  'other',
] as const;
export type MktPage = (typeof PAGES)[number];

export const MKT_SECTIONS: readonly string[] = [
  's1_hero',
  's14_closing',
  'closing',
  'payments',
  'website',
  'team',
  'assessments',
  'students',
  'languages',
  'how-it-works',
  'faq',
  'pricing',
  'trial',
  'limits',
  'honest-limits',
  'not-yet',
  'lessons',
  'roles',
  'separation',
  'sign-in',
  'stored-data',
  'privacy-requests',
];
const CTAS: readonly string[] = ['cta_t', 'cta_c', 'cta_pricing'];
const BILLING: readonly string[] = ['monthly', 'yearly'];
const LOCALES: readonly string[] = ['en', 'ar'];
const MAX_FAQ_INDEX = 20;

/** The campaign register (mirrors the backend's `MKT_UTM_REGISTER`). */
const UTM_REGISTER = {
  utm_source: [
    'google',
    'bing',
    'facebook',
    'instagram',
    'linkedin',
    'x',
    'youtube',
    'tiktok',
    'whatsapp',
    'newsletter',
    'email',
  ],
  utm_medium: [
    'cpc',
    'paid_social',
    'social',
    'organic_social',
    'email',
    'referral',
    'display',
    'partner',
    'qr',
  ],
  utm_campaign: ['m1a_launch', 'brand', 'retargeting'],
} as const;
type UtmField = keyof typeof UTM_REGISTER;

export type MktEventName =
  | 'page_viewed'
  | 'section_viewed'
  | 'faq_expanded'
  | 'language_switched'
  | 'cta_clicked'
  | 'billing_toggle_changed'
  | 'contact_form_started'
  | 'contact_form_submitted'
  | 'campaign_landing';

export interface MktEventProps {
  value?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer_domain?: string;
}

export interface MktEvent {
  readonly name: MktEventName;
  readonly page: MktPage;
  readonly locale: 'en' | 'ar';
  readonly device: 'mobile' | 'desktop';
  readonly props?: MktEventProps;
}

export interface BeaconHandle {
  /** Sends whatever is queued now. */
  flush(): void;
  /** Removes every listener (tests; a second `startBeacon` is a no-op until then). */
  stop(): void;
}

/** Global Privacy Control or Do Not Track asks not to be measured. */
export function optedOut(nav: Navigator = navigator): boolean {
  const withSignals = nav as Navigator & { globalPrivacyControl?: boolean };
  return withSignals.globalPrivacyControl === true || nav.doNotTrack === '1';
}

const includes = (list: readonly string[], value: unknown): value is string =>
  typeof value === 'string' && list.includes(value);

export function pageTemplate(doc: Document = document): MktPage {
  const page = doc.body?.dataset.mktPage;
  return includes(PAGES, page) ? (page as MktPage) : 'other';
}

function locale(doc: Document): 'en' | 'ar' {
  return doc.documentElement.lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function device(): 'mobile' | 'desktop' {
  try {
    return window.matchMedia('(max-width: 767px)').matches
      ? 'mobile'
      : 'desktop';
  } catch {
    return 'desktop';
  }
}

function registered(field: UtmField, raw: string | null): string | undefined {
  if (raw === null) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === '') return undefined;
  return (UTM_REGISTER[field] as readonly string[]).includes(value)
    ? value
    : 'unregistered';
}

const HOSTNAME =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** The referring site as a bare hostname, or undefined (none, same site, or not a plain host). */
export function referrerDomain(
  referrer: string,
  ownHost: string
): string | undefined {
  if (!referrer) return undefined;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  host = host.replace(/\.$/, '').replace(/^www\./, '');
  if (host === ownHost.toLowerCase().replace(/^www\./, '')) return undefined;
  if (host.length > 100 || !HOSTNAME.test(host)) return undefined;
  if ((host.match(/\d/g) ?? []).length >= 7) return undefined;
  return host;
}

/** `campaign_landing` props from the landed URL — read in memory, never stored or sent raw. */
export function campaignProps(
  search: string,
  referrer: string,
  ownHost: string
): MktEventProps | null {
  const params = new URLSearchParams(search);
  const fields: UtmField[] = ['utm_source', 'utm_medium', 'utm_campaign'];
  if (!fields.some((field) => params.has(field))) return null;
  const props: MktEventProps = {};
  for (const field of fields) {
    const value = registered(field, params.get(field));
    if (value) props[field] = value;
  }
  const domain = referrerDomain(referrer, ownHost);
  if (domain) props.referrer_domain = domain;
  return props;
}

function send(events: readonly MktEvent[]): void {
  if (events.length === 0) return;
  const body = JSON.stringify({ events });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.(MKT_EVENTS_ENDPOINT, blob)) return;
  } catch {
    // Fall through to fetch.
  }
  try {
    void fetch(MKT_EVENTS_ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);
  } catch {
    // Measurement never breaks the page.
  }
}

let active: BeaconHandle | null = null;

/**
 * Starts the beacon for this page view. Returns null (and does nothing at
 * all) when the browser opts out. Never throws.
 */
export function startBeacon(): BeaconHandle | null {
  if (active) return active;
  try {
    if (optedOut()) return null;
  } catch {
    return null;
  }
  try {
    const doc = document;
    const base = {
      page: pageTemplate(doc),
      locale: locale(doc),
      device: device(),
    };
    let queue: MktEvent[] = [];
    const cleanups: Array<() => void> = [];
    const listen = <K extends string>(
      target: EventTarget,
      type: K,
      handler: (event: Event) => void,
      capture = false
    ) => {
      target.addEventListener(type, handler, capture);
      cleanups.push(() => target.removeEventListener(type, handler, capture));
    };

    const flush = () => {
      while (queue.length > 0) send(queue.splice(0, MAX_PER_REQUEST));
    };
    const track = (name: MktEventName, props?: MktEventProps) => {
      queue.push(props ? { name, ...base, props } : { name, ...base });
      if (queue.length >= MKT_FLUSH_AT) flush();
    };

    track('page_viewed');
    const campaign = campaignProps(
      window.location.search,
      doc.referrer,
      window.location.hostname
    );
    if (campaign) track('campaign_landing', campaign);

    listen(doc, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const cta = target.closest<HTMLElement>('[data-mkt-cta]')?.dataset.mktCta;
      if (includes(CTAS, cta)) track('cta_clicked', { value: cta });
      const switcher = target.closest('a[hreflang]');
      if (switcher && switcher.closest('header, footer')) {
        const lang = switcher.getAttribute('hreflang')?.toLowerCase();
        if (includes(LOCALES, lang))
          track('language_switched', { value: lang });
      }
    });

    // `toggle` does not bubble: listen in the capture phase.
    listen(
      doc,
      'toggle',
      (event) => {
        const details = event.target;
        if (!(details instanceof HTMLDetailsElement) || !details.open) return;
        const faq = details.closest('.mk-faq');
        if (!faq) return;
        const index =
          Array.from(faq.querySelectorAll('details')).indexOf(details) + 1;
        if (index >= 1 && index <= MAX_FAQ_INDEX)
          track('faq_expanded', { value: String(index) });
      },
      true
    );

    listen(doc, 'change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'radio')
        return;
      if (!input.checked || !input.closest('.mk-billing')) return;
      if (includes(BILLING, input.value))
        track('billing_toggle_changed', { value: input.value });
    });

    let formStarted = false;
    listen(
      doc,
      'input',
      (event) => {
        if (formStarted) return;
        const field = event.target instanceof Element ? event.target : null;
        if (!field?.closest('form[data-contact-form]')) return;
        // The honeypot is not a person starting the form.
        if ((field as HTMLInputElement).name === 'company') return;
        formStarted = true;
        track('contact_form_started');
      },
      true
    );
    listen(doc, 'mkt:contact-submitted', () => track('contact_form_submitted'));

    if (typeof IntersectionObserver === 'function') {
      const seen = new Set<string>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5)
              continue;
            observer.unobserve(entry.target);
            const id = (entry.target as HTMLElement).dataset.mktSection;
            if (!includes(MKT_SECTIONS, id) || seen.has(id)) continue;
            seen.add(id);
            track('section_viewed', { value: id });
          }
        },
        { threshold: 0.5 }
      );
      doc
        .querySelectorAll<HTMLElement>('[data-mkt-section]')
        .forEach((section) => {
          if (includes(MKT_SECTIONS, section.dataset.mktSection))
            observer.observe(section);
        });
      cleanups.push(() => observer.disconnect());
    }

    listen(window, 'pagehide', flush);
    listen(doc, 'visibilitychange', () => {
      if (doc.visibilityState === 'hidden') flush();
    });

    active = {
      flush,
      stop: () => {
        cleanups.splice(0).forEach((cleanup) => cleanup());
        queue = [];
        active = null;
      },
    };
    return active;
  } catch {
    return null;
  }
}
