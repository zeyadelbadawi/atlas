/**
 * Presentation helpers for the Platform Owner's contact inbox (TASK 7).
 * Status is always shown as words (via `StatusBadge`); the tone only
 * reinforces it.
 */
import type { StatusTone } from '@components/data-display';
import type {
  PlatformContactSubmissionStatus,
  PlatformContactSubmissionTopic,
} from '../services/PlatformContactSubmissionService';

export function contactStatusLabelKey(
  status: PlatformContactSubmissionStatus
): string {
  return `platform:contactSubmissions.status.${status}`;
}

export function contactTopicLabelKey(
  topic: PlatformContactSubmissionTopic
): string {
  return `platform:contactSubmissions.topics.${topic}`;
}

export function contactStatusTone(
  status: PlatformContactSubmissionStatus
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

/** One line for list rows: every run of whitespace becomes one space. */
export function toContactExcerpt(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

/** The toast confirming a status change; leaving `archived` reads as a restore. */
export function contactStatusToastKey(
  from: PlatformContactSubmissionStatus,
  to: PlatformContactSubmissionStatus
): string {
  if (to === 'archived') return 'platform:contactSubmissions.toasts.archived';
  if (from === 'archived') return 'platform:contactSubmissions.toasts.restored';
  return to === 'read'
    ? 'platform:contactSubmissions.toasts.markedRead'
    : 'platform:contactSubmissions.toasts.markedUnread';
}
