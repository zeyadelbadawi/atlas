/**
 * B1 F.5 — the marketing website's cookieless beacon: GPC/DNT send nothing,
 * only closed vocabularies leave the browser, no storage API is touched,
 * the payload has the backend's shape, and no URL, query or fragment is
 * ever sent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MKT_EVENTS_ENDPOINT,
  MKT_FLUSH_AT,
  campaignProps,
  optedOut,
  pageTemplate,
  referrerDomain,
  startBeacon,
  type BeaconHandle,
  type MktEvent,
} from './beacon';

type Observed = { target: Element; cb: IntersectionObserverCallback };
let observed: Observed[] = [];

class FakeIntersectionObserver {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  observe(target: Element) {
    observed.push({ target, cb: this.cb });
  }
  unobserve() {}
  disconnect() {}
}

function reveal(id: string, ratio = 0.6): void {
  for (const { target, cb } of observed) {
    if ((target as HTMLElement).dataset.mktSection !== id) continue;
    cb(
      [
        {
          target,
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    );
  }
}

const sent: MktEvent[][] = [];
const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
  sent.push((JSON.parse(String(init.body)) as { events: MktEvent[] }).events);
  return new Response(null, { status: 204 });
});
const sendBeaconMock = vi.fn(() => false);

function setSignals(gpc: boolean | undefined, dnt: string | null): void {
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    value: gpc,
    configurable: true,
  });
  Object.defineProperty(navigator, 'doNotTrack', {
    value: dnt,
    configurable: true,
  });
}

function setMobile(mobile: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: mobile && query === '(max-width: 767px)',
      media: query,
    }),
  });
}

const PAGE_HTML = `
  <header><a href="/ar" hreflang="ar" lang="ar">العربية</a></header>
  <main>
    <section data-mkt-section="s1_hero"><a href="/signup" data-mkt-cta="cta_t">Start</a></section>
    <section data-mkt-section="faq">
      <div class="mk-faq">
        <details><summary>Q1</summary>A1</details>
        <details><summary>Q2</summary>A2</details>
      </div>
    </section>
    <section data-mkt-section="secret-user-section"></section>
    <div class="mk-billing">
      <input type="radio" name="b" value="monthly" checked>
      <input type="radio" name="b" value="yearly">
    </div>
    <a href="/x" data-mkt-cta="cta_founding">Founding</a>
    <a href="/en" hreflang="en">inline (not header/footer)</a>
    <form data-contact-form><input name="company"><input name="name"></form>
  </main>
  <footer><a href="/" hreflang="en" lang="en">English</a></footer>`;

// jsdom cannot navigate: keep test clicks on links from trying to.
document.addEventListener('click', (event) => event.preventDefault());

let handle: BeaconHandle | null = null;
const flushed = (): MktEvent[] => {
  handle?.flush();
  return sent.flat();
};

beforeEach(() => {
  sent.length = 0;
  observed = [];
  fetchMock.mockClear();
  sendBeaconMock.mockClear();
  sendBeaconMock.mockImplementation(() => false);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  Object.defineProperty(navigator, 'sendBeacon', {
    value: sendBeaconMock,
    configurable: true,
  });
  setSignals(undefined, null);
  setMobile(false);
  document.documentElement.lang = 'en';
  document.body.innerHTML = PAGE_HTML;
  document.body.dataset.mktPage = 'mkt:home';
  Object.defineProperty(document, 'referrer', {
    value: '',
    configurable: true,
  });
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  handle?.stop();
  handle = null;
  vi.unstubAllGlobals();
  delete document.body.dataset.mktPage;
});

describe('opt-out', () => {
  it('honours Global Privacy Control and Do Not Track', () => {
    setSignals(true, null);
    expect(optedOut()).toBe(true);
    setSignals(undefined, '1');
    expect(optedOut()).toBe(true);
    setSignals(false, '0');
    expect(optedOut()).toBe(false);
  });

  it.each([
    [true, null],
    [undefined, '1'],
  ] as const)(
    'GPC=%s / DNT=%s: nothing is started, listened to or sent',
    (gpc, dnt) => {
      setSignals(gpc, dnt);
      const add = vi.spyOn(document, 'addEventListener');
      handle = startBeacon();
      expect(handle).toBeNull();
      document.querySelector<HTMLElement>('[data-mkt-cta="cta_t"]')!.click();
      window.dispatchEvent(new Event('pagehide'));
      expect(add).not.toHaveBeenCalled();
      expect(observed).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(sendBeaconMock).not.toHaveBeenCalled();
    }
  );
});

describe('payload', () => {
  it('sends page_viewed on load, with the page template, locale and device only', () => {
    document.documentElement.lang = 'ar';
    setMobile(true);
    handle = startBeacon();
    expect(flushed()).toEqual([
      { name: 'page_viewed', page: 'mkt:home', locale: 'ar', device: 'mobile' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      MKT_EVENTS_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
      })
    );
  });

  it('prefers sendBeacon with a JSON blob, to the endpoint', () => {
    sendBeaconMock.mockImplementation(() => true);
    handle = startBeacon();
    handle?.flush();
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeaconMock.mock.calls[0] as unknown as [
      string,
      Blob,
    ];
    expect(url).toBe('/api/v1/mkt/events');
    expect(blob.type).toBe('application/json');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to "other" for an unknown or missing page template', () => {
    document.body.dataset.mktPage = '/pricing?x=1';
    expect(pageTemplate()).toBe('other');
    delete document.body.dataset.mktPage;
    expect(pageTemplate()).toBe('other');
    document.body.dataset.mktPage = 'mkt:pricing';
    expect(pageTemplate()).toBe('mkt:pricing');
  });

  it('flushes on pagehide, on visibilitychange to hidden, and at the batch size', () => {
    handle = startBeacon();
    window.dispatchEvent(new Event('pagehide'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cta = document.querySelector<HTMLElement>('[data-mkt-cta="cta_t"]')!;
    cta.click();
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    for (let i = 0; i < MKT_FLUSH_AT; i += 1) cta.click();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sent[2]).toHaveLength(MKT_FLUSH_AT);
  });
});

describe('vocabulary', () => {
  it('reports each interaction with its closed-list value, and nothing outside the lists', () => {
    handle = startBeacon();
    document.querySelector<HTMLElement>('[data-mkt-cta="cta_t"]')!.click();
    document
      .querySelector<HTMLElement>('[data-mkt-cta="cta_founding"]')!
      .click();
    document.querySelector<HTMLElement>('header a[hreflang]')!.click();
    document.querySelector<HTMLElement>('footer a[hreflang]')!.click();
    document.querySelector<HTMLElement>('main > a[hreflang]')!.click();

    const second = document.querySelectorAll('details')[1];
    second.open = true;
    second.dispatchEvent(new Event('toggle'));
    second.open = false;
    second.dispatchEvent(new Event('toggle'));

    const yearly = document.querySelector<HTMLInputElement>(
      'input[value="yearly"]'
    )!;
    yearly.checked = true;
    yearly.dispatchEvent(new Event('change', { bubbles: true }));

    reveal('s1_hero');
    reveal('s1_hero');
    reveal('faq', 0.2);
    reveal('secret-user-section');

    const honeypot = document.querySelector<HTMLInputElement>(
      'input[name="company"]'
    )!;
    honeypot.dispatchEvent(new Event('input', { bubbles: true }));
    const name =
      document.querySelector<HTMLInputElement>('input[name="name"]')!;
    name.dispatchEvent(new Event('input', { bubbles: true }));
    name.dispatchEvent(new Event('input', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('mkt:contact-submitted'));

    const events = flushed().map((e) => [e.name, e.props?.value ?? '']);
    expect(events).toEqual([
      ['page_viewed', ''],
      ['cta_clicked', 'cta_t'],
      ['language_switched', 'ar'],
      ['language_switched', 'en'],
      ['faq_expanded', '2'],
      ['billing_toggle_changed', 'yearly'],
      ['section_viewed', 's1_hero'],
      ['contact_form_started', ''],
      ['contact_form_submitted', ''],
    ]);
    // Never observed: a section id outside the list.
    expect(
      observed.map((o) => (o.target as HTMLElement).dataset.mktSection)
    ).toEqual(['s1_hero', 'faq']);
  });
});

describe('campaign landing and the URL', () => {
  it('maps UTM values onto the register and reduces the referrer to a hostname', () => {
    expect(
      campaignProps(
        '?utm_source=Google&utm_medium=cpc&utm_campaign=Ahmed%40example.com',
        'https://www.News.Example.com/path?q=1#frag',
        'atlas.test'
      )
    ).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'unregistered',
      referrer_domain: 'news.example.com',
    });
    expect(
      campaignProps('?topic=sales', 'https://google.com/', 'atlas.test')
    ).toBeNull();
    expect(
      referrerDomain('https://atlas.test/pricing', 'www.atlas.test')
    ).toBeUndefined();
    expect(
      referrerDomain('https://192.168.1.10/', 'atlas.test')
    ).toBeUndefined();
    expect(referrerDomain('not a url', 'atlas.test')).toBeUndefined();
  });

  it('sends campaign_landing once and never a URL, path, query, fragment or raw value', () => {
    window.history.replaceState(
      null,
      '',
      '/pricing/secret-path?utm_source=newsletter&utm_campaign=ahmed%40example.com&email=x%40y.z#frag'
    );
    Object.defineProperty(document, 'referrer', {
      value: 'https://mail.example.org/inbox/12345?token=SECRET',
      configurable: true,
    });
    handle = startBeacon();
    document.querySelector<HTMLElement>('[data-mkt-cta="cta_t"]')!.click();
    const events = flushed();
    expect(events.filter((e) => e.name === 'campaign_landing')).toEqual([
      {
        name: 'campaign_landing',
        page: 'mkt:home',
        locale: 'en',
        device: 'desktop',
        props: {
          utm_source: 'newsletter',
          utm_campaign: 'unregistered',
          referrer_domain: 'mail.example.org',
        },
      },
    ]);
    const wire = fetchMock.mock.calls
      .map(([, init]) => String(init.body))
      .join('\n');
    for (const leak of [
      'http',
      '/pricing',
      'secret',
      '?',
      '#',
      '@',
      '%40',
      'email',
      'token',
      'SECRET',
      '12345',
      'inbox',
    ])
      expect(wire).not.toContain(leak);
    for (const event of events) {
      expect(Object.keys(event).sort()).toEqual(
        event.props
          ? ['device', 'locale', 'name', 'page', 'props']
          : ['device', 'locale', 'name', 'page']
      );
    }
  });
});

describe('storage', () => {
  it('never touches cookies, localStorage, sessionStorage or IndexedDB', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const cookieGet = vi.spyOn(Document.prototype, 'cookie', 'get');
    const cookieSet = vi.spyOn(Document.prototype, 'cookie', 'set');
    const idbOpen = vi.fn();
    vi.stubGlobal('indexedDB', { open: idbOpen });
    window.history.replaceState(null, '', '/?utm_source=google');

    handle = startBeacon();
    document.querySelector<HTMLElement>('[data-mkt-cta="cta_t"]')!.click();
    reveal('s1_hero');
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).toHaveBeenCalled();
    for (const spy of [
      getItem,
      setItem,
      removeItem,
      cookieGet,
      cookieSet,
      idbOpen,
    ])
      expect(spy).not.toHaveBeenCalled();
  });
});
