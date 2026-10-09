/**
 * A request's history as a vertical timeline: created, status changes
 * (from → to), messages from the customer and the team, and — in the
 * Platform Owner view only — internal notes and assignments.
 *
 * Semantics first: an ordered list (the order IS the meaning), every
 * moment a `<time>` with its machine-readable value, the status change
 * spelled out for assistive tech instead of relying on the arrow. The
 * rail sits on the inline-start edge, so it flips with the page in RTL.
 *
 * Internal notes are visually unmistakable — amber surface, lock icon and
 * an "Only visible to the Atlas team" line — because the cost of
 * confusing one for a customer-visible reply is a broken confidence.
 */
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CircleDot,
  Lock,
  MessageSquare,
  RefreshCw,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter, useLanguage } from '@hooks';
import { MIRROR_IN_RTL, cn, formatRelativeTime } from '@utils';
import { CR_NS } from '../constants/customer-request.constants';
import {
  customerRequestStatusLabelKey,
  customerRequestStatusTone,
} from '../utils/customer-request.utils';
import type { CustomerRequestEvent } from '../types/customer-request.types';

export interface CustomerRequestTimelineProps {
  readonly events: readonly CustomerRequestEvent[];
  /** Platform Owner view: internal events are shown (and marked). */
  readonly showInternal?: boolean;
}

const KIND_ICON: Readonly<Record<CustomerRequestEvent['kind'], LucideIcon>> = {
  created: CircleDot,
  status_changed: RefreshCw,
  assigned: UserCheck,
  customer_message: MessageSquare,
  team_message: MessageSquare,
  internal_note: Lock,
};

export function CustomerRequestTimeline({
  events,
  showInternal = false,
}: CustomerRequestTimelineProps): JSX.Element {
  const { t } = useTranslation();
  const visible = showInternal
    ? events
    : events.filter((event) => event.visibility !== 'internal');

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t(`${CR_NS}:detail.timelineEmpty`)}
      </p>
    );
  }

  return (
    <ol
      aria-label={t(`${CR_NS}:timeline.label`)}
      className="relative space-y-5"
      data-testid="customer-request-timeline"
    >
      {visible.map((event, index) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={index === visible.length - 1}
        />
      ))}
    </ol>
  );
}

function TimelineItem({
  event,
  isLast,
}: {
  readonly event: CustomerRequestEvent;
  readonly isLast: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const Icon = KIND_ICON[event.kind];
  const isInternal =
    event.kind === 'internal_note' || event.visibility === 'internal';
  const isMessage =
    event.kind === 'customer_message' ||
    event.kind === 'team_message' ||
    event.kind === 'internal_note';
  const fromTeam = event.actorSide === 'team';
  const actor = event.actorName;

  const headline = (() => {
    switch (event.kind) {
      case 'created':
        return t(`${CR_NS}:timeline.created`, { actor });
      case 'status_changed':
        return t(`${CR_NS}:timeline.statusChanged`, { actor });
      case 'assigned':
        return event.assignee
          ? t(`${CR_NS}:timeline.assigned`, {
              actor,
              assignee: event.assignee.name,
            })
          : t(`${CR_NS}:timeline.unassigned`, { actor });
      case 'internal_note':
        return t(`${CR_NS}:timeline.internalNote`, { actor });
      case 'team_message':
        return t(`${CR_NS}:timeline.teamMessage`, { actor });
      case 'customer_message':
      default:
        return t(`${CR_NS}:timeline.customerMessage`, { actor });
    }
  })();

  return (
    <li
      className="relative ps-10"
      data-testid={`customer-request-event-${event.id}`}
      data-kind={event.kind}
      data-internal={isInternal ? 'true' : undefined}
    >
      {/* The rail between this moment and the next one. */}
      {isLast ? null : (
        <span
          className="absolute start-[0.9375rem] top-8 h-[calc(100%-0.75rem)] w-px bg-border"
          aria-hidden
        />
      )}
      <span
        className={cn(
          'absolute start-0 top-0 flex size-8 items-center justify-center rounded-full border bg-background',
          isInternal
            ? 'border-warning/50 text-warning'
            : fromTeam
              ? 'border-primary/40 text-primary'
              : 'border-border text-muted-foreground'
        )}
        aria-hidden
      >
        <Icon className="size-3.5" strokeWidth={2} />
      </span>

      <div className="min-w-0 space-y-2 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-sm font-medium text-foreground">
            <span dir="auto">{headline}</span>
            {fromTeam && !isInternal ? (
              <span className="ms-2 text-xs font-normal text-muted-foreground">
                {t(`${CR_NS}:timeline.atlasTeam`)}
              </span>
            ) : null}
          </p>
          <time
            dateTime={event.createdAt}
            title={fmt.dateTime(event.createdAt)}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatRelativeTime(event.createdAt, language)}
            <span className="sr-only"> ({fmt.dateTime(event.createdAt)})</span>
          </time>
        </div>

        {event.kind === 'status_changed' && event.toStatus ? (
          <div className="flex flex-wrap items-center gap-2">
            {event.fromStatus ? (
              <>
                <StatusBadge
                  labelKey={customerRequestStatusLabelKey(event.fromStatus)}
                  tone="neutral"
                />
                <ArrowRight
                  className={cn(
                    'size-3.5 text-muted-foreground',
                    MIRROR_IN_RTL
                  )}
                  aria-hidden
                />
              </>
            ) : null}
            <StatusBadge
              labelKey={customerRequestStatusLabelKey(event.toStatus)}
              tone={customerRequestStatusTone(event.toStatus)}
            />
            <span className="sr-only">
              {event.fromStatus
                ? t(`${CR_NS}:timeline.fromTo`, {
                    from: t(customerRequestStatusLabelKey(event.fromStatus)),
                    to: t(customerRequestStatusLabelKey(event.toStatus)),
                  })
                : t(customerRequestStatusLabelKey(event.toStatus))}
            </span>
          </div>
        ) : null}

        {isMessage && event.body ? (
          <div
            className={cn(
              'rounded-lg border p-3',
              isInternal
                ? 'border-warning/40 bg-warning-surface'
                : fromTeam
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-card'
            )}
          >
            {isInternal ? (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-warning">
                <Lock className="size-3.5" strokeWidth={2} aria-hidden />
                {t(`${CR_NS}:timeline.internalHint`)}
              </p>
            ) : null}
            {/* `pre-wrap` keeps the paragraphs people type; `dir="auto"`
                lets an Arabic message read right-to-left in an English
                page (and vice versa). Text, never markup. */}
            <p
              className="whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]"
              dir="auto"
            >
              {event.body}
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}
