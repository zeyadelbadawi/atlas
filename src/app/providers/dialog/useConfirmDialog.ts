/**
 * Reads the confirmation dialog service.
 */
import { useContext } from 'react';
import { DialogContext } from './dialog.context';
import type { DialogContextValue } from './dialog.context';

export function useConfirmDialog(): DialogContextValue {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error('useConfirmDialog must be used within AtlasDialogProvider.');
  }

  return context;
}