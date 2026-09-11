/**
 * MyTicketsList (Phase 8) — "track the tickets I submitted".
 *
 * Shows only the caller's own tickets; the backend scopes the list to
 * the authenticated requester (RLS, not a client-side filter), so
 * nothing here narrows the response further. Status is rendered through
 * `StatusBadge` with a translated label — never the raw `open`/
 * `in_progress` enum string.
 */
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SkeletonList } from '@components/loading';
import type { StatusTone } from '@components/data-display';
import { useMySupportCases } from '../hooks/useTenantSupportCases';
import type { SupportCaseStatus } from '@types';

/** Maps the real lifecycle to the design system's semantic tones — no invented statuses. */
const STATUS_TONE: Record<SupportCaseStatus, StatusTone> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export function MyTicketsList(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useMySupportCases();

  if (isLoading) {
    return <SkeletonList items={3} />;
  }

  // A failed ticket list must not take the whole dashboard down with it —
  // one translated sentence, same "never leak the technical error" rule
  // the submit form follows.
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {t('dashboard:support.list.loadFailed')}
      </p>
    );
  }

  const tickets = data?.items ?? [];

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        titleKey="dashboard:support.list.empty.title"
        descriptionKey="dashboard:support.list.empty.description"
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {tickets.map((ticket) => (
        <li
          key={ticket.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-medium text-foreground">
              {ticket.subject}
            </span>
            <span className="text-sm text-muted-foreground">
              {t('dashboard:support.list.submittedOn', {
                date: new Date(ticket.createdAt).toLocaleDateString(
                  i18n.language
                ),
              })}
            </span>
          </div>
          <StatusBadge
            labelKey={`dashboard:support.status.${ticket.status}`}
            tone={STATUS_TONE[ticket.status]}
          />
        </li>
      ))}
    </ul>
  );
}
