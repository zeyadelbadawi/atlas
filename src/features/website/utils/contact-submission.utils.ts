/**
 * Presentation helpers for website Contact form messages.
 *
 * Status is always shown as words (via `StatusBadge`) — the tone only
 * reinforces it, never replaces it.
 */
import type { StatusTone } from '@components/data-display';
import { formatInternational } from '@components/phone';
import type { ContactSubmission, ContactSubmissionStatus } from '@types';

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

/** Whether a submission came from a "register your interest" section (CMS phase 3d). */
export function isInterestSubmission(submission: ContactSubmission): boolean {
  return submission.kind === 'interest';
}

/** How to reach the visitor, for list rows: the email, else the phone (`+20 100 123 4567`). */
export function toSubmissionContact(submission: ContactSubmission): string {
  if (submission.email) return submission.email;
  return submission.phone ? formatInternational(submission.phone) : '';
}

/**
 * A list row's one-line summary: the message, else (an interest
 * submission without one) the option chosen — "Grade: Third secondary".
 */
export function toSubmissionExcerpt(submission: ContactSubmission): string {
  const message = toMessageExcerpt(submission.message);
  if (message || !submission.choice) return message;
  return submission.choiceLabel
    ? `${submission.choiceLabel}: ${submission.choice}`
    : submission.choice;
}
