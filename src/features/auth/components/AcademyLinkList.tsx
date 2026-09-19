/**
 * Academy link list (P64 Phase 1).
 *
 * The ONE rendering of "here are your academies, go there" — shared by the
 * management sign-in refusal (`StudentSignInRefusal`), the academy chooser
 * a learner with a platform-host session lands on, and the legacy
 * `/dashboard/learning/*` redirect page. An academy with a public host is
 * a real absolute link to that host; one without a host yet is named but
 * not linked, so the learner is never sent to a URL that cannot answer.
 *
 * Cross-origin on purpose: an academy website is a different origin with
 * its own session, so these are plain `<a href>`s (a router `Link` cannot
 * leave the SPA), and nothing here auto-navigates — the learner chooses.
 */
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, GraduationCap } from 'lucide-react';
import { cn } from '@utils';
import { buildAcademyUrl } from '../utils/academy-surface.utils';

export interface AcademyLinkListItem {
  readonly academyId: string;
  readonly name: string;
  readonly host?: string;
  /** Shown as a small note under the name when present (e.g. pending approval). */
  readonly note?: string;
}

export interface AcademyLinkListProps {
  readonly academies: readonly AcademyLinkListItem[];
  /** The path on the academy host every link points at, e.g. `/sign-in` or `/my-learning`. */
  readonly targetPath: string;
  /** Renders a single academy as the one prominent action instead of a list row. */
  readonly emphasizeSingle?: boolean;
  readonly className?: string;
}

export function AcademyLinkList({
  academies,
  targetPath,
  emphasizeSingle = false,
  className,
}: AcademyLinkListProps): JSX.Element {
  const { t } = useTranslation();

  if (academies.length === 0) {
    return (
      <p
        className={cn('text-sm text-muted-foreground', className)}
        data-testid="academy-link-list-empty"
      >
        {t('auth:academyList.empty')}
      </p>
    );
  }

  const single = emphasizeSingle && academies.length === 1 ? academies[0] : null;
  if (single?.host) {
    return (
      <a
        href={buildAcademyUrl(single.host, targetPath)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90',
          className
        )}
        data-testid="academy-link-primary"
      >
        <GraduationCap className="size-4" aria-hidden />
        {t('auth:academyList.goTo', { academy: single.name })}
        <ArrowUpRight className="size-4" aria-hidden />
      </a>
    );
  }

  return (
    <ul
      className={cn('divide-y divide-border rounded-lg border border-border', className)}
      data-testid="academy-link-list"
    >
      {academies.map((academy) => {
        const url = academy.host
          ? buildAcademyUrl(academy.host, targetPath)
          : undefined;
        const body = (
          <>
            <span className="flex min-w-0 items-center gap-3">
              <GraduationCap
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground" dir="auto">
                  {academy.name}
                </span>
                {academy.host ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {academy.host}
                  </span>
                ) : (
                  <span className="block text-xs text-muted-foreground">
                    {t('auth:academyList.noWebsiteYet')}
                  </span>
                )}
                {academy.note ? (
                  <span className="block text-xs text-warning">{academy.note}</span>
                ) : null}
              </span>
            </span>
            {url ? (
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </>
        );

        return (
          <li key={academy.academyId}>
            {url ? (
              <a
                href={url}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="academy-link"
              >
                {body}
              </a>
            ) : (
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 opacity-70"
                aria-disabled="true"
                data-testid="academy-link-disabled"
              >
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
