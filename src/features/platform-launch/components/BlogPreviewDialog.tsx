/**
 * B3 — "Preview": the post as the blog shows it, in either language, using
 * the public article layout and renderer. A saved post with no pending
 * edits is previewed from the server (`/platform-blog-posts/:id/preview`,
 * the public detail shape ignoring status); otherwise from the editor's
 * current text, which the dialog says.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter } from '@hooks';
import { BlogArticle } from '@/marketing/blog/article';
import { readingMinutes } from '@/marketing/blog/markdown';
import { usePlatformBlogPreview } from '../hooks/usePlatformBlog';
import type {
  BlogCoverImage,
  BlogLocale,
  BlogTopic,
  BlogTranslation,
} from '../types';
import { K, isTranslationEmpty } from '../utils/launch.utils';

export function BlogPreviewDialog({
  open,
  onOpenChange,
  postId,
  dirty,
  initialLocale,
  local,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly postId: string | null;
  readonly dirty: boolean;
  readonly initialLocale: BlogLocale;
  readonly local: {
    readonly topic: BlogTopic;
    readonly authorName: string;
    readonly coverImage: BlogCoverImage | null;
    readonly publishAt: string | null;
    readonly translations: Readonly<Record<BlogLocale, BlogTranslation>>;
  };
}): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const [locale, setLocale] = useState<BlogLocale>(initialLocale);
  const fromServer = Boolean(postId) && !dirty;
  const server = usePlatformBlogPreview(postId, locale, open && fromServer);
  const lt = (key: string, values?: Record<string, unknown>) =>
    t(`${K}${key}`, { lng: locale, ...(values ?? {}) });

  const renderArticle = () => {
    if (fromServer) {
      if (server.isLoading || !server.data) {
        return server.error ? (
          <p className="text-sm text-muted-foreground">
            {lt('editor.preview.noLanguage')}
          </p>
        ) : (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        );
      }
      const post = server.data;
      return (
        <BlogArticle
          lang={locale}
          titleAs="h2"
          title={post.title}
          excerpt={post.excerpt}
          body={post.body}
          topicLabel={lt(`blog.topics.${post.topic}`)}
          byline={lt('editor.preview.byline', {
            author: post.authorName,
            minutes: post.readingMinutes,
          })}
          date={
            post.publishAt
              ? { label: fmt.date(post.publishAt), iso: post.publishAt }
              : undefined
          }
          cover={
            post.coverImage ? { ...post.coverImage, alt: post.coverAlt } : null
          }
        />
      );
    }
    const translation = local.translations[locale];
    if (isTranslationEmpty(translation)) {
      return (
        <p className="text-sm text-muted-foreground">
          {lt('editor.preview.noLanguage')}
        </p>
      );
    }
    return (
      <BlogArticle
        lang={locale}
        titleAs="h2"
        title={translation.title}
        excerpt={translation.excerpt}
        body={translation.body}
        topicLabel={lt(`blog.topics.${local.topic}`)}
        byline={lt('editor.preview.byline', {
          author: local.authorName,
          minutes: readingMinutes(translation.body),
        })}
        date={
          local.publishAt
            ? { label: fmt.date(local.publishAt), iso: local.publishAt }
            : undefined
        }
        cover={
          local.coverImage
            ? { ...local.coverImage, alt: translation.coverAlt }
            : null
        }
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(`${K}editor.preview.title`)}</DialogTitle>
          <DialogDescription>
            {t(`${K}editor.preview.description`)}
            {fromServer ? null : <> {t(`${K}editor.preview.unsavedNote`)}</>}
          </DialogDescription>
        </DialogHeader>
        <div
          role="group"
          aria-label={t(`${K}editor.preview.languageLabel`)}
          className="inline-flex w-fit rounded-md border border-border p-0.5"
        >
          {(['en', 'ar'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={locale === option}
              onClick={() => setLocale(option)}
              className="min-h-9 rounded px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t(`${K}editor.tabs.${option}`)}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-8 sm:px-8">
          {renderArticle()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
