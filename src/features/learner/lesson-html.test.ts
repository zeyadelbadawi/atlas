/**
 * The lesson-body sanitiser (P64 Phase 2 §E.3).
 *
 * WHAT THIS PROTECTS. `grant.bodyHtml` is staff-authored HTML that the
 * player has to render AS HTML, which makes every lesson body a potential
 * script-injection surface aimed at that academy's own learners, in their
 * session, on the academy's own origin. "The author is staff" is not a
 * mitigation — an instructor account is exactly the account an attacker
 * would want — and one compromised author reaches every student of the
 * course.
 *
 * WHY THE CASES BELOW AND NOT OTHERS. Each is a vector that has defeated
 * a real-world blocklist sanitiser: a bare `<script>`, an event handler
 * on an otherwise-innocent tag, a `javascript:` URL, the same URL with a
 * control character in it, and a tag whose CONTENT must die with it.
 * Together they are the argument for an allowlist: the last case is the
 * one no blocklist author thinks of, and it is why "strip `<script>`" is
 * not a sanitiser.
 *
 * The heading case is not security — it is the document outline. The
 * player already renders the activity title as the page's `<h1>`, and a
 * second one inside the body breaks heading navigation for exactly the
 * reader who depends on it.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeLessonHtml } from './utils/lesson-html.utils';

describe('lesson body sanitiser', () => {
  it('keeps the prose a lesson is actually made of', () => {
    const html = sanitizeLessonHtml(
      '<h2>Layers</h2><p>Use <strong>groups</strong> to organise them.</p><ul><li>One</li><li>Two</li></ul>'
    );

    expect(html).toContain('<h2>Layers</h2>');
    expect(html).toContain('<strong>groups</strong>');
    expect(html).toContain('<li>One</li>');
  });

  it('removes a script tag and its contents', () => {
    const html = sanitizeLessonHtml(
      '<p>Before</p><script>fetch("/steal")</script><p>After</p>'
    );

    expect(html).toContain('Before');
    expect(html).toContain('After');
    expect(html).not.toContain('script');
    expect(html).not.toContain('steal');
  });

  it('removes event handlers from tags it otherwise allows', () => {
    const html = sanitizeLessonHtml(
      '<img src="https://cdn.example.com/a.png" onerror="alert(1)" alt="A">'
    );

    expect(html).toContain('src="https://cdn.example.com/a.png"');
    expect(html).not.toContain('onerror');
  });

  it('drops a javascript: link but keeps its text', () => {
    // eslint-disable-next-line no-script-url
    const html = sanitizeLessonHtml('<a href="javascript:alert(1)">Click</a>');

    expect(html).toContain('Click');
    expect(html).not.toContain('javascript:');
  });

  it('is not fooled by a control character inside the scheme', () => {
    const html = sanitizeLessonHtml('<a href="java\tscript:alert(1)">Click</a>');

    expect(html).not.toContain('script:');
  });

  it('keeps a real link and makes it safe to follow', () => {
    const html = sanitizeLessonHtml('<a href="https://example.com">Docs</a>');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).toContain('target="_blank"');
  });

  it('removes an iframe entirely, contents included', () => {
    const html = sanitizeLessonHtml(
      '<iframe src="https://evil.example.com"><p>fallback</p></iframe>'
    );

    expect(html).not.toContain('iframe');
    expect(html).not.toContain('evil.example.com');
  });

  it('unwraps an unknown element rather than losing the prose inside it', () => {
    const html = sanitizeLessonHtml('<section><p>Kept</p></section>');

    expect(html).not.toContain('section');
    expect(html).toContain('<p>Kept</p>');
  });

  it('demotes an author h1 so the page keeps one top-level heading', () => {
    const html = sanitizeLessonHtml('<h1>Lesson title again</h1>');

    expect(html).toContain('<h2>Lesson title again</h2>');
    expect(html).not.toContain('<h1');
  });

  it('strips inline styles, which are not content', () => {
    const html = sanitizeLessonHtml(
      '<p style="position:fixed;inset:0;z-index:99">Overlay</p>'
    );

    expect(html).toContain('Overlay');
    expect(html).not.toContain('style=');
  });

  it('returns nothing for nothing', () => {
    expect(sanitizeLessonHtml(undefined)).toBe('');
    expect(sanitizeLessonHtml('')).toBe('');
  });
});
