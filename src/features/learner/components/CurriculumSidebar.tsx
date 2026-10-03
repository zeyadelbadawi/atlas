/**
 * The player's curriculum list (§E.2).
 *
 * ONE VIEW OF THE SEQUENCE. This renders `sequence.items` in the order
 * the server gave, grouped back into its units, with the server's own
 * ordinals. It does not sort, does not renumber and does not filter — the
 * sidebar, Previous/Next and Continue are three views of one array
 * precisely so they cannot disagree, and a helpful local sort here is how
 * that guarantee gets broken.
 *
 * EVERY ITEM SHOWS ITS STATE AS ICON *AND* TEXT (§E.2, §E.6). A column of
 * unlabelled glyphs is what the accessibility audit found: meaningful to
 * a sighted learner who has learned the key, and literally nothing to a
 * screen reader. The icon is `aria-hidden` and the state is a real word
 * beside it.
 *
 * A LOCKED ITEM IS LISTED, AND SAYS WHY. That is the whole reason the
 * sequence carries `lockReason` — "why can't I open lesson 4" is the most
 * common learner support ticket there is, and the four reasons
 * (`previousIncomplete`, `scheduled`, `notStarted`, `accessEnded`) each
 * get a real sentence. A locked row is NOT a link: it goes nowhere, so it
 * is rendered as plain content rather than as a control that swallows a
 * click.
 *
 * `aria-current="true"`, not `"page"`. The item being played is not a
 * separate page in the routing sense on every activity — and even where
 * it is, "true" is the honest generic value for "this is the current one
 * in this set". The list is a `<nav>` so a screen reader can jump to it.
 */
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@utils';
import type { CourseSequenceItem } from '@types';
import {
  formatSequenceOrdinal,
  groupSequenceByUnit,
  sequenceLockReasonKey,
  sequenceStateIcon,
  sequenceStateLabelKey,
  sequenceTypeIcon,
  sequenceTypeLabelKey,
} from '../utils/sequence.utils';
import type { LanguageCode } from '@types';

export interface CurriculumSidebarProps {
  readonly items: readonly CourseSequenceItem[];
  readonly currentItemId: string | undefined;
  /** Builds the href for one item. Returns undefined for anything unreachable. */
  readonly hrefFor: (item: CourseSequenceItem) => string | undefined;
  readonly language: LanguageCode;
  /** Closes the drawer on a phone once a destination is chosen. */
  readonly onNavigate?: () => void;
  readonly className?: string;
}

export function CurriculumSidebar({
  items,
  currentItemId,
  hrefFor,
  language,
  onNavigate,
  className,
}: CurriculumSidebarProps): JSX.Element {
  const { t } = useTranslation();
  const units = groupSequenceByUnit(items);

  return (
    <nav
      aria-label={t('learning:player.curriculum.label')}
      className={cn('space-y-5', className)}
    >
      {units.map((unit) => (
        <div key={unit.sectionId}>
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {unit.sectionTitle}
          </h3>

          <ul className="mt-1.5 space-y-0.5">
            {unit.items.map((item) => {
              const StateIcon = sequenceStateIcon(item.state);
              const TypeIcon = sequenceTypeIcon(item.type);
              const isCurrent = item.id === currentItemId;
              const isLocked = item.state === 'locked';
              const href = isLocked ? undefined : hrefFor(item);

              const body = (
                <>
                  <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                    {formatSequenceOrdinal(item, language)}
                    <TypeIcon className="size-3.5" aria-hidden />
                    <span className="sr-only">
                      {t(sequenceTypeLabelKey(item.type))}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <StateIcon className="size-3" aria-hidden />
                      {t(sequenceStateLabelKey(item.state))}
                      {isLocked && item.lockReason ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">
                            {t(sequenceLockReasonKey(item.lockReason))}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </span>
                </>
              );

              const rowClass = cn(
                'flex w-full items-start gap-2 rounded-md px-2 py-2 text-start',
                isCurrent && 'bg-accent text-accent-foreground',
                // Not `opacity-70`: that took the muted state text below
                // 4.5:1. The lock icon, "Locked" and the reason say it.
                isLocked && 'text-muted-foreground'
              );

              return (
                <li key={`${item.type}-${item.id}`}>
                  {href ? (
                    <Link
                      to={href}
                      onClick={onNavigate}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={cn(
                        rowClass,
                        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      )}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      className={rowClass}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      {body}
                      <Lock
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
