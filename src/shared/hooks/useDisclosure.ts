/**
 * Manages the open state of a dialog, drawer, popover or collapsible section.
 *
 * Centralising this pattern keeps every overlay in Atlas behaving identically
 * and removes repeated `useState` boilerplate from components.
 */
import { useCallback, useMemo, useState } from 'react';

export interface DisclosureState {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
  /** Matches the controlled-component APIs of Radix primitives. */
  readonly setOpen: (isOpen: boolean) => void;
}

export function useDisclosure(initialOpen = false): DisclosureState {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((previous) => !previous), []);
  const setOpen = useCallback((next: boolean) => setIsOpen(next), []);

  return useMemo(
    () => ({ isOpen, open, close, toggle, setOpen }),
    [isOpen, open, close, toggle, setOpen]
  );
}