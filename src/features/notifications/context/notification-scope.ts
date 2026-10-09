/**
 * Notification context isolation — which notification context this part of
 * the app shows: the Management dashboard, or one academy's learner area.
 *
 * The SERVER decides what a request may see, from the session; this only
 * gives each context its own cache identity, so a feed fetched in one
 * context is never served from the cache in another (the dashboard and an
 * academy share one origin in local development, and a stale entry must
 * never cross from Academy A to Academy B or to Management).
 * Defaults to Management; the learner tree provides `academy:<id>`
 * through `NotificationScopeProvider`.
 */
import { createContext, useContext } from 'react';

export type NotificationScopeKey = 'management' | `academy:${string}`;

export const NotificationScopeContext =
  createContext<NotificationScopeKey>('management');

export function useNotificationScope(): NotificationScopeKey {
  return useContext(NotificationScopeContext);
}
