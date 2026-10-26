/**
 * B3 — one blog post's article body: header (topic, title, excerpt, byline),
 * cover image and the Markdown body. Rendered by the public blog page (on
 * the `ssr` container, inside the marketing header and footer) and by the
 * dashboard editor's preview, so both show the same thing.
 *
 * Plain Tailwind utilities on tokens only (no marketing `mk-*` classes), so
 * it styles the same in the marketing and the dashboard builds.
 */
import type { ReactNode } from 'react';
import { renderBlogMarkdown } from './markdown';

export interface BlogArticleProps {
  readonly lang: 'en' | 'ar';
  readonly title: string;
  readonly excerpt: string;
  readonly body: string;
  readonly topicLabel: string;
  /** e.g. "Atlas team · 6 min read". */
  readonly byline: string;
  /** Formatted publish date, with its ISO value for `<time>`. */
  readonly date?: { readonly label: string; readonly iso: string };
  readonly cover?: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
  } | null;
  /** Rendered above the title (breadcrumbs on the site). */
  readonly before?: ReactNode;
  /** Rendered after the body (related posts on the site). */
  readonly after?: ReactNode;
  /** The heading level of the title: the page's h1 on the site. */
  readonly titleAs?: 'h1' | 'h2';
}

export function BlogArticle({
  lang,
  title,
  excerpt,
  body,
  topicLabel,
  byline,
  date,
  cover,
  before,
  after,
  titleAs = 'h1',
}: BlogArticleProps) {
  const Title = titleAs;
  return (
    <article
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="mx-auto w-full max-w-3xl"
    >
      {before}
      <header className="space-y-4">
        <p className="text-sm font-semibold text-primary">{topicLabel}</p>
        <Title className="text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          {title}
        </Title>
        <p className="text-lg leading-8 text-muted-foreground">{excerpt}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{byline}</span>
          {date ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={date.iso}>{date.label}</time>
            </>
          ) : null}
        </p>
      </header>
      {cover ? (
        <figure className="mt-8">
          <img
            src={cover.url}
            width={cover.width}
            height={cover.height}
            alt={cover.alt}
            decoding="async"
            className="h-auto w-full rounded-xl border border-border bg-muted object-cover"
          />
        </figure>
      ) : null}
      <div className="mt-6 text-base sm:text-[1.0625rem]" data-blog-body>
        {renderBlogMarkdown(body)}
      </div>
      {after}
    </article>
  );
}
