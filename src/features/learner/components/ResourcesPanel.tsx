/**
 * The lesson's downloadable and linked resources (§E.3).
 *
 * TWO KINDS, AND THE DIFFERENCE IS STATED. A resource with a `url` is an
 * Atlas-hosted file behind a short-lived signed link; a resource with an
 * `externalUrl` is somewhere else entirely and carries none of the
 * protections the rest of the lesson does. Labelling the second kind is
 * the same honesty rule the protection badge follows — a learner clicking
 * a link out of a paid course should know they are leaving it.
 *
 * SIGNED LINKS ARE NOT COPIED ANYWHERE. They are rendered as `href` and
 * nothing more: no "copy link" affordance, no preloading, no storage. The
 * URL dies with its presign, so a copied one is a link that will look
 * broken later, and a stored one is a credential sitting in a place with
 * no expiry.
 *
 * The caption track a text or video lesson uses is drawn from this same
 * list (`ProtectedVideoPlayer` matches `.vtt`) and is deliberately still
 * listed here: a learner who wants the transcript as a file should be
 * able to take it.
 */
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GrantedResource } from '@types';

export interface ResourcesPanelProps {
  readonly resources: readonly GrantedResource[];
}

export function ResourcesPanel({
  resources,
}: ResourcesPanelProps): JSX.Element | null {
  const { t } = useTranslation();

  if (resources.length === 0) return null;

  return (
    <section
      aria-labelledby="lesson-resources-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="lesson-resources-heading"
        className="flex items-center gap-2 font-display text-sm font-semibold text-foreground"
      >
        <Paperclip className="size-4" aria-hidden />
        {t('learning:player.resources.title')}
      </h2>

      <ul className="mt-3 space-y-1">
        {resources.map((resource) => {
          const href = resource.url ?? resource.externalUrl;
          if (!href) return null;
          const isExternal = !resource.url;

          return (
            <li key={resource.id}>
              {/* One control per row, never a row that is itself
                  clickable with a button inside it — the nested-interactive
                  pattern the accessibility audit called out. */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-auto w-full justify-start gap-2 px-2 py-2 text-start"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  download={isExternal ? undefined : resource.title}
                >
                  {isExternal ? (
                    <ExternalLink className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <Download className="size-4 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {resource.title}
                  </span>
                  {isExternal ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t('learning:player.resources.externalLabel')}
                    </span>
                  ) : null}
                </a>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
