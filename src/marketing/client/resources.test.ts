/**
 * B3 — /resources "Latest from the blog": the three static topic cards are
 * replaced in place by the newest posts; a failure or an empty list keeps
 * them. Text only, locale-aware links and digits.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initLatestPosts, parsePosts, renderLatestPosts } from './resources';

beforeEach(() => {
  document.body.innerHTML = `
    <ul data-blog-latest data-locale="ar" data-reading-time="قراءة %s دقيقة">
      <li><a href="/ar/blog/topics/protection">a</a></li><li></li><li></li>
    </ul>
    <p data-blog-latest-fallback>fallback</p>`;
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('latest posts', () => {
  it('parses safe posts only', () => {
    expect(
      parsePosts({
        items: [
          { slug: 'ok-post', title: 'T', excerpt: 'E', readingMinutes: 4 },
          { slug: '../x', title: 'bad' },
          { slug: 'no-title' },
        ],
      })
    ).toEqual([
      { slug: 'ok-post', title: 'T', excerpt: 'E', readingMinutes: 4 },
    ]);
    expect(parsePosts({})).toEqual([]);
  });

  it('replaces the topic cards with Arabic links and digits', () => {
    const list = document.querySelector('[data-blog-latest]') as HTMLElement;
    renderLatestPosts(list, [
      {
        slug: 'exam-season',
        title: '<b>موسم</b>',
        excerpt: 'مقتطف',
        readingMinutes: 5,
      },
    ]);
    const link = list.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/ar/blog/exam-season');
    expect(link.querySelector('b')).toBeNull();
    expect(link.textContent).toContain('قراءة ٥ دقيقة');
    expect(
      (document.querySelector('[data-blog-latest-fallback]') as HTMLElement)
        .hidden
    ).toBe(true);
  });

  it('keeps the static cards on failure', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('down'));
    initLatestPosts(window);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      document.querySelector('[data-blog-latest] a')?.getAttribute('href')
    ).toBe('/ar/blog/topics/protection');
    expect(window.fetch).toHaveBeenCalledWith(
      '/api/v1/public/blog/posts?locale=ar&pageSize=3',
      expect.anything()
    );
  });
});
