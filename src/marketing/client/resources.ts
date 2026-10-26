/**
 * B3 — the resources hub's "Latest from the blog" (`/resources`): replaces
 * the three static topic cards with the three newest posts from
 * `GET /api/v1/public/blog/posts?locale=&pageSize=3`, in the same three
 * card slots (no layout shift). On any failure, or with no posts, the
 * static cards stay. Text is set with `textContent` only.
 */
export interface LatestPost {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly readingMinutes: number;
}

export const BLOG_POSTS_ENDPOINT = '/api/v1/public/blog/posts';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parsePosts(data: unknown): LatestPost[] {
  const items = (data as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => item as Record<string, unknown>)
    .filter(
      (item) =>
        typeof item.slug === 'string' &&
        SLUG.test(item.slug) &&
        typeof item.title === 'string'
    )
    .map((item) => ({
      slug: item.slug as string,
      title: item.title as string,
      excerpt: typeof item.excerpt === 'string' ? item.excerpt : '',
      readingMinutes: Number.isFinite(item.readingMinutes)
        ? Math.max(1, Number(item.readingMinutes))
        : 1,
    }))
    .slice(0, 3);
}

export function renderLatestPosts(
  list: HTMLElement,
  posts: readonly LatestPost[]
): void {
  if (posts.length === 0) return;
  const doc = list.ownerDocument;
  const lang = list.dataset.locale === 'ar' ? 'ar' : 'en';
  // `%s` is the number (the page writes it so no `{token}` is left in the HTML).
  const readingTemplate = list.dataset.readingTime ?? '%s';
  const number = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US');
  const items = posts.map((post) => {
    const li = doc.createElement('li');
    li.className = 'flex';
    const a = doc.createElement('a');
    a.href = `${lang === 'ar' ? '/ar' : ''}/blog/${post.slug}`;
    a.className =
      'mk-card flex min-h-[11rem] w-full flex-col p-6 hover:border-primary';
    const title = doc.createElement('span');
    title.className = 'block text-lg font-semibold text-foreground';
    title.textContent = post.title;
    const excerpt = doc.createElement('span');
    excerpt.className =
      'mt-2 line-clamp-3 block leading-relaxed text-muted-foreground';
    excerpt.textContent = post.excerpt;
    const meta = doc.createElement('span');
    meta.className = 'mt-auto block pt-4 text-sm text-muted-foreground';
    meta.textContent = readingTemplate.replace(
      '%s',
      number.format(post.readingMinutes)
    );
    a.append(title, excerpt, meta);
    li.append(a);
    return li;
  });
  list.replaceChildren(...items);
  list.dataset.loaded = 'true';
  const fallback = doc.querySelector<HTMLElement>(
    '[data-blog-latest-fallback]'
  );
  if (fallback) fallback.hidden = true;
}

export function initLatestPosts(win: Window = window): void {
  const list = win.document.querySelector<HTMLElement>('[data-blog-latest]');
  if (!list) return;
  const locale = list.dataset.locale === 'ar' ? 'ar' : 'en';
  win
    .fetch(`${BLOG_POSTS_ENDPOINT}?locale=${locale}&pageSize=3`, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    })
    .then((response) =>
      response.ok ? (response.json() as Promise<unknown>) : Promise.reject()
    )
    .then((data) => renderLatestPosts(list, parsePosts(data)))
    .catch(() => {
      // Keep the static topic cards.
    });
}
