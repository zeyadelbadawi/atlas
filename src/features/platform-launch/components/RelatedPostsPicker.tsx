/**
 * B3 — up to three related posts. The candidates are the other posts (one
 * list request; the blog is small), filtered as you type. Chosen posts are
 * listed in order with a labelled remove button each.
 */
import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlatformBlogPosts } from '../hooks/usePlatformBlog';
import { BLOG_LIMITS, K, postTitle } from '../utils/launch.utils';

export function RelatedPostsPicker({
  id,
  postId,
  value,
  onChange,
}: {
  readonly id: string;
  /** The post being edited (never its own related post). */
  readonly postId: string | null;
  readonly value: readonly string[];
  readonly onChange: (ids: string[]) => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const all = usePlatformBlogPosts({ page: 1, pageSize: 100, sort: 'title' });
  const posts = useMemo(() => all.data?.items ?? [], [all.data?.items]);
  const byId = useMemo(
    () => new Map(posts.map((post) => [post.id, post])),
    [posts]
  );
  const full = value.length >= BLOG_LIMITS.relatedMax;

  const term = search.trim().toLowerCase();
  const candidates = posts
    .filter((post) => post.id !== postId && !value.includes(post.id))
    .filter((post) => {
      if (!term) return true;
      const haystack = [
        post.slug,
        post.translations.en?.title,
        post.translations.ar?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    })
    .slice(0, 6);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t(`${K}editor.related.hint`)}
      </p>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(`${K}editor.related.none`)}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {value.map((relatedId) => {
            const post = byId.get(relatedId);
            const title = post ? postTitle(post, i18n.language) : relatedId;
            return (
              <li
                key={relatedId}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 ps-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                  {title}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() =>
                    onChange(value.filter((entry) => entry !== relatedId))
                  }
                  aria-label={t(`${K}editor.related.remove`, { title })}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      {full ? (
        <p className="text-xs text-muted-foreground">
          {t(`${K}editor.related.max`)}
        </p>
      ) : (
        <div className="space-y-2">
          <label htmlFor={id} className="sr-only">
            {t(`${K}editor.related.search`)}
          </label>
          <Input
            id={id}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t(`${K}editor.related.search`)}
            dir="auto"
            autoComplete="off"
          />
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t(`${K}editor.related.noMatches`)}
            </p>
          ) : (
            <ul
              className="space-y-1"
              aria-label={t(`${K}editor.related.search`)}
            >
              {candidates.map((post) => {
                const title = postTitle(post, i18n.language);
                return (
                  <li key={post.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...value, post.id]);
                        setSearch('');
                      }}
                      className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate" dir="auto">
                        {title}
                      </span>
                      <span className="sr-only">
                        {t(`${K}editor.related.add`)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
