/**
 * Toast context definition.
 *
 * Toasts are described with translation keys rather than resolved strings, so a
 * service or hook can request feedback without knowing the active language.
 */
import { createContext } from 'react';

/** Visual and semantic intent of a notification. */
export type ToastIntent = 'success' | 'error' | 'warning' | 'info';

export interface ToastRequest {
  readonly intent: ToastIntent;
  /** Translation key for the toast title. */
  readonly titleKey: string;
  /** Translation key for the optional supporting description. */
  readonly descriptionKey?: string;
  /** Interpolation values shared by the title and description. */
  readonly values?: Record<string, string | number>;
  /** Optional action, typically an undo affordance. */
  readonly action?: {
    readonly labelKey: string;
    readonly onAction: () => void;
  };
}

export interface ToastContextValue {
  /** Shows a notification. */
  readonly notify: (request: ToastRequest) => void;
  /** Shorthand for a success notification. */
  readonly notifySuccess: (
    titleKey: string,
    descriptionKey?: string,
    values?: Record<string, string | number>
  ) => void;
  /** Shorthand for an error notification. */
  readonly notifyError: (
    titleKey: string,
    descriptionKey?: string,
    values?: Record<string, string | number>
  ) => void;
  /** Removes every visible notification. */
  readonly dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined
);