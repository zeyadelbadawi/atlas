/**
 * B3 — the blog Markdown renderer is sanitized: no raw HTML, only safe
 * link and image targets, one h1 per page (the title), Arabic heading ids.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  blogHeadingSlug,
  blogHeadings,
  isSafeBlogHref,
  isSafeBlogImage,
  readingMinutes,
  renderBlogMarkdown,
} from './markdown';

const html = (md: string) =>
  renderToStaticMarkup(<>{renderBlogMarkdown(md)}</>);

describe('blog markdown renderer', () => {
  it('renders headings, lists, emphasis and tables with token classes', () => {
    const out = html(
      '## Why it matters\n\nSome **bold** text.\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |'
    );
    expect(out).toContain('<h2 id="why-it-matters"');
    expect(out).toContain('<strong');
    expect(out).toContain('<ul');
    expect(out).toContain('<table');
    expect(out).not.toContain('<h1');
  });

  it('demotes a body h1 to h2', () => {
    expect(html('# Big title')).toMatch(/^<h2[^>]*>Big title<\/h2>$/);
  });

  it('never parses raw HTML', () => {
    const out = html(
      'Hello <script>alert(1)</script> <img src=x onerror=alert(1)> <iframe src="https://evil"></iframe>'
    );
    // Escaped as text: no element and no attribute is ever created.
    expect(out).not.toMatch(/<script|<iframe|<img/);
    expect(out).toContain('&lt;script&gt;');
  });

  it('keeps only safe links and drops unsafe images', () => {
    const out = html(
      '[a](https://example.com) [b](/pricing) [c](mailto:hi@example.com) [d](javascript:alert(1)) [e](//evil.com) [f](data:text/html,x)\n\n![ok](/marketing-assets/blog/x.webp) ![bad](http://insecure.example/x.png) ![js](javascript:alert(1))'
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('href="/pricing"');
    expect(out).toContain('href="mailto:hi@example.com"');
    expect(out).not.toMatch(/javascript:|\/\/evil\.com|data:text/);
    expect(out).toContain('src="/marketing-assets/blog/x.webp"');
    expect(out).not.toContain('insecure.example');
    expect(out).toContain('loading="lazy"');
  });

  it('validates targets', () => {
    expect(isSafeBlogHref('#faq')).toBe(true);
    expect(isSafeBlogHref('/\\evil')).toBe(false);
    expect(isSafeBlogHref('ftp://x')).toBe(false);
    expect(isSafeBlogImage('https://cdn.example/x.webp')).toBe(true);
    expect(isSafeBlogImage('http://cdn.example/x.webp')).toBe(false);
  });

  it('slugs Arabic headings and lists ## headings', () => {
    expect(blogHeadingSlug('لماذا الحماية مهمة؟')).toBe('لماذا-الحماية-مهمة');
    expect(
      blogHeadings('## One\n\n```\n## not a heading\n```\n\n## Two **bold**')
    ).toEqual([
      { id: 'one', text: 'One' },
      { id: 'two-bold', text: 'Two bold' },
    ]);
    expect(html('## لماذا الحماية مهمة؟')).toContain('id="لماذا-الحماية-مهمة"');
  });

  it('estimates reading minutes like the server (words / 200, at least 1)', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes(Array(600).fill('w').join(' '))).toBe(3);
  });
});
