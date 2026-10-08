/** Notification context isolation — see `notification-scope.ts`. */
import type { ReactNode } from 'react';
import {
  NotificationScopeContext,
  type NotificationScopeKey,
} from './notification-scope';

export function NotificationScopeProvider({
  scope,
  children,
}: {
  readonly scope: NotificationScopeKey;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <NotificationScopeContext.Provider value={scope}>
      {children}
    </NotificationScopeContext.Provider>
  );
}
