/**
 * Dialog context definition.
 *
 * Confirmation is mandatory for destructive and permanent actions. Exposing it
 * as a promise-based service means a feature can await a decision without
 * managing dialog state, and every confirmation looks and behaves the same.
 */
import { createContext } from 'react';

/** Visual intent of a confirmation dialog. */
export type ConfirmIntent = 'default' | 'destructive';

export interface ConfirmRequest {
  /** Translation key for the dialog title. */
  readonly titleKey: string;
  /** Translation key for the explanation of the consequence. */
  readonly descriptionKey: string;
  /** Translation key for the confirm button. Must name the action. */
  readonly confirmLabelKey: string;
  /** Translation key for the cancel button. */
  readonly cancelLabelKey?: string;
  readonly intent?: ConfirmIntent;
  /** Interpolation values shared by the title and description. */
  readonly values?: Record<string, string | number>;
}

export interface DialogContextValue {
  /** Opens a confirmation dialog. Resolves true when the user confirms. */
  readonly confirm: (request: ConfirmRequest) => Promise<boolean>;
}

export const DialogContext = createContext<DialogContextValue | undefined>(
  undefined
);