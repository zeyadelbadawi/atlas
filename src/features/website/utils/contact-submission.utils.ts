/**
 * Presentation helpers for website Contact form messages.
 *
 * Status is always shown as words (via `StatusBadge`) — the tone only
 * reinforces it, never replaces it.
 */
import type { StatusTone } from '@components/data-display';
import type { ContactSubmissionStatus } from '@types';

export function getContactSubmissionStatusLabelKey(
  status: ContactSubmissionStatus
): string {
  return `website:messages.status.${status}`;
}

export function getContactSubmissionStatusTone(
  status: ContactSubmissionStatus
): StatusTone {
  switch (status) {
    case 'new':
      return 'info';
    case 'archived':
      return 'warning';
    default:
      return 'neutral';
  }
}

/**
 * A message collapsed to one line for list rows: every run of whitespace
 * (line breaks included) becomes a single space. The full text, line
 * breaks intact, is what the detail sheet shows.
 */
export function toMessageExcerpt(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

/**
 * The toast confirming a status change. Leaving `archived` is a restore
 * whatever the target status, so it reads as one.
 */
export function getStatusChangeToastKey(
  from: ContactSubmissionStatus,
  to: ContactSubmissionStatus
): string {
  if (to === 'archived') return 'website:messages.toasts.archived';
  if (from === 'archived') return 'website:messages.toasts.restored';
  return to === 'read'
    ? 'website:messages.toasts.markedRead'
    : 'website:messages.toasts.markedUnread';
}
