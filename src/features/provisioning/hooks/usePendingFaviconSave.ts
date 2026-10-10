/**
 * Saves the setup form's favicon once the Academy is ready (see
 * `pending-favicon.ts`). One attempt per user action; a failure is reported
 * as `failed` with a `retry`, never as saved.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useUpdateAcademyBranding } from '@features/academy';
import type { ProvisioningRequest } from '@types';
import {
  pendingFaviconStore,
  type PendingFaviconState,
} from '../logo/pending-favicon';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function usePendingFaviconSave(
  request: ProvisioningRequest | undefined
): {
  readonly state: PendingFaviconState | 'none';
  readonly retry: () => void;
} {
  useSyncExternalStore(
    pendingFaviconStore.subscribe,
    pendingFaviconStore.version,
    pendingFaviconStore.version
  );
  const { mutateAsync } = useUpdateAcademyBranding();
  const requestId = request?.id;
  const academyId = request?.academyId;
  const ready = request?.status === 'ready';
  const entry = requestId ? pendingFaviconStore.get(requestId) : undefined;

  const save = useCallback(() => {
    if (!requestId || !academyId) return;
    const current = pendingFaviconStore.get(requestId);
    // The store is the guard: two surfaces never save the same favicon twice.
    if (!current || current.state === 'saving' || current.state === 'saved')
      return;
    pendingFaviconStore.transition(requestId, 'saving');
    void readFileAsDataUrl(current.file)
      .then((favicon) => mutateAsync({ id: academyId, payload: { favicon } }))
      .then(() => pendingFaviconStore.transition(requestId, 'saved'))
      .catch(() => pendingFaviconStore.transition(requestId, 'failed'));
  }, [requestId, academyId, mutateAsync]);

  useEffect(() => {
    if (ready && entry?.state === 'waiting') save();
  }, [ready, entry?.state, save]);

  const retry = useCallback(() => {
    if (requestId) pendingFaviconStore.transition(requestId, 'waiting');
  }, [requestId]);

  return { state: entry?.state ?? 'none', retry };
}
