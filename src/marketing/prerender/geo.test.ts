/**
 * GEO (B1-4): robots.txt purpose groups, llms.txt and llms-full.txt.
 *
 *  - robots: search/answer engines and user-triggered fetchers allowed,
 *    training crawlers (and Google-Extended, in its own group) disallowed,
 *    then `*` allowed, then the Sitemap line; app paths never disallowed;
 *  - llms.txt links only listed, indexable pages — never the 404 or a
 *    planned URL — plus /pricing.md and /llms-full.txt;
 *  - llms-full.txt carries every listed page's H1 (EN first, then AR),
 *    from <main> only, and the pricing file.
 */
import { describe, expect, it } from 'vitest';
import { buildMarketingSite } from './site';
import { htmlToText, mainHtml } from './llms-full';
import { buildLlmsTxt, buildRobotsTxt, type LlmsCopy } from './seo-files';
import { FIXTURE_ASSETS, FIXTURE_CTX, FIXTURE_PAGES } from './test-fixtures';

/** robots.txt as groups: { agents, rules }. */
function groups(robots: string) {
  const result: { agents: string[]; rules: string[] }[] = [];
  let current: { agents: string[]; rules: string[] } | null = null;
  for (const raw of robots.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (field === 'User-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        result.push(current);
      }
      current.agents.push(value);
    } else if (field === 'Allow' || field === 'Disallow') {
      current?.rules.push(`${field}: ${value}`);
    }
  }
  return result;
}

describe('robots.txt purpose groups', () => {
  const robots = buildRobotsTxt(FIXTURE_CTX);

  it('allows search and answer engines, then user fetchers; disallows training crawlers', () => {
    expect(groups(robots)).toEqual([
      {
        agents: [
          'Googlebot',
          'Bingbot',
          'OAI-SearchBot',
          'PerplexityBot',
          'Claude-SearchBot',
          'Applebot',
        ],
        rules: ['Allow: /'],
      },
      {
        agents: ['ChatGPT-User', 'Claude-User', 'Perplexity-User'],
        rules: ['Allow: /'],
      },
      {
        agents: ['GPTBot', 'ClaudeBot', 'CCBot', 'Applebot-Extended'],
        rules: ['Disallow: /'],
      },
      { agents: ['Google-Extended'], rules: ['Disallow: /'] },
      { agents: ['*'], rules: ['Allow: /'] },
    ]);
  });

  it('summarises the policy at the top and ends with the Sitemap line', () => {
    expect(robots.startsWith('# ')).toBe(true);
    expect(robots.split('\n').slice(0, 4).join(' ')).toMatch(/allowed.*train/i);
    expect(robots.trim().split('\n').pop()).toBe(
      'Sitemap: https://atlass.dpdns.org/sitemap.xml'
    );
  });
});

const COPY: LlmsCopy = {
  heading: 'Atlas',
  summary: 'Atlas is a branded academy platform.',
  details: 'Details paragraph.',
  pagesTitle: 'Pages',
  pageNotes: { home: 'The home page.', pricing: 'Plans and limits.' },
  pricingFileNote: 'Prices from the catalog.',
  crawlerPolicy:
    'Search and answer crawlers may read this site; training crawlers may not.',
};

describe('llms.txt and llms-full.txt', () => {
  const site = buildMarketingSite({
    pages: FIXTURE_PAGES,
    ctx: FIXTURE_CTX,
    assets: FIXTURE_ASSETS,
    llms: {
      en: COPY,
      ar: { ...COPY, summary: 'أطلس منصة.', pagesTitle: 'الصفحات' },
    },
  });
  const file = (path: string) =>
    site.files.find((f) => f.path === path)?.contents ?? '';

  it('has the brand H1, both summaries, page links with notes, the files and the crawler policy', () => {
    const llms = file('llms.txt');
    expect(llms.split('\n')[0]).toBe('# Atlas');
    expect(llms).toContain('> Atlas is a branded academy platform.');
    expect(llms).toContain('> أطلس منصة.');
    expect(llms).toContain(
      '- [home title en | Atlas](https://atlass.dpdns.org/): The home page.'
    );
    expect(llms).toContain('## الصفحات');
    expect(llms).toContain(
      '(https://atlass.dpdns.org/ar/pricing): Plans and limits.'
    );
    expect(llms).toContain('https://atlass.dpdns.org/pricing.md');
    expect(llms).toContain('https://atlass.dpdns.org/llms-full.txt');
    expect(llms).toContain(COPY.crawlerPolicy);
  });

  it('links only listed, indexable pages: no 404, no planned URL', () => {
    const llms = file('llms.txt');
    const links = [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(
      (m) => m[1]
    );
    expect(links.filter((l) => !/\.(md|txt)$/.test(l))).toEqual([
      'https://atlass.dpdns.org/',
      'https://atlass.dpdns.org/pricing',
      'https://atlass.dpdns.org/ar',
      'https://atlass.dpdns.org/ar/pricing',
    ]);
    expect(llms).not.toMatch(/404|notFound/);
  });

  it('falls back to a factual file without copy', () => {
    const llms = buildLlmsTxt({ ctx: FIXTURE_CTX, pages: [] });
    expect(llms.split('\n')[0]).toBe('# Atlas');
    expect(llms).toContain('/pricing.md');
    expect(llms).toMatch(/GPTBot/);
    expect(llms).not.toMatch(/\bfree\b/i);
  });

  it('llms-full.txt has every listed page H1, EN before AR, main content only, then pricing', () => {
    const full = file('llms-full.txt');
    const order = [
      '# home heading en',
      '# pricing heading en',
      '# home heading ar',
      '# pricing heading ar',
    ];
    const positions = order.map((h1) => full.indexOf(`\n${h1}\n`));
    expect(positions.every((p) => p > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(full).not.toContain('notFound heading');
    expect(full).not.toContain('Header nav link');
    expect(full).not.toContain('Footer text');
    expect(full).not.toContain('decorative');
    expect(full).toContain('- First point\n- Second point');
    expect(full).toContain('Start Talk to us');
    expect(full.indexOf('# Atlas pricing')).toBeGreaterThan(positions[3]);
  });
});

describe('htmlToText', () => {
  it('converts headings, lists, tables and entities and drops scripts, svg and hidden content', () => {
    const html =
      '<h2>Plans &amp; prices</h2><p>One<br>two</p><script>alert(1)</script>' +
      '<svg><path d="M0"></path></svg><div hidden="">gone</div>' +
      '<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Teacher</td><td>EGP 1,190</td></tr></table>' +
      '<details><summary>Question?</summary><p>Answer.</p></details><button type="button">Menu</button>';
    expect(htmlToText(html)).toBe(
      '## Plans & prices\n\nOne two\n\n| Plan | Price |\n| Teacher | EGP 1,190 |\n\nQuestion?\n\nAnswer.'
    );
  });

  it('takes the first <main>', () => {
    expect(
      mainHtml(
        '<header>x</header><main class="a"><p>y</p></main><footer>z</footer>'
      )
    ).toBe('<p>y</p>');
  });
});
