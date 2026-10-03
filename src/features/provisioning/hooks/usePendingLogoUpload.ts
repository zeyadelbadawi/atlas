/**
 * W2 — attaches the setup form's logo once the Academy exists (see
 * `pending-logo.ts`). Driven entirely by the server's view of the request:
 *
 *   - `requestedBrand.logo` is `'none'`/absent → nothing to do;
 *   - `'attached'` → done (the server applied it);
 *   - `'awaiting_upload'` and the file is still in this page → upload it to
 *     the new Academy's media library as soon as `academyId` is set, then
 *     attach it by media-asset id (`PUT …/brand-logo`) and put the server's
 *     answer straight into the query cache;
 *   - `'awaiting_upload'` with no file here (the page was reloaded or closed
 *     before the upload) → `'missing'`: the UI says the logo was not added
 *     and links to Brand settings. Never a pretend "saved".
 *
 * One attempt per user action — a failure shows Retry; there are no timed
 * re-tries or artificial waits.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mediaService } from '@features/media';
import { provisioningKeys } from '@services/query';
import type { ProvisioningRequest } from '@types';
import { provisioningService } from '../services/ProvisioningService';
import { pendingLogoStore } from '../logo/pending-logo';

export type LogoUploadState =
  'none' | 'waiting' | 'uploading' | 'failed' | 'missing' | 'attached';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadAndAttach(
  organizationId: string,
  requestId: string,
  academyId: string,
  file: File
): Promise<ProvisioningRequest> {
  const dataUrl = await readFileAsDataUrl(file);
  const asset = await mediaService.uploadAsset(academyId, {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    dataUrl,
  });
  return provisioningService.attachProvisioningLogo(
    organizationId,
    requestId,
    asset.id
  );
}

export function usePendingLogoUpload(
  request: ProvisioningRequest | undefined
): { readonly state: LogoUploadState; readonly retry: () => void } {
  const queryClient = useQueryClient();
  useSyncExternalStore(
    pendingLogoStore.subscribe,
    pendingLogoStore.version,
    pendingLogoStore.version
  );

  const requestId = request?.id;
  const organizationId = request?.organizationId;
  const academyId = request?.academyId;
  const serverLogo = request?.requestedBrand?.logo ?? 'none';
  const entry = requestId ? pendingLogoStore.get(requestId) : undefined;

  const start = useCallback(() => {
    if (!requestId || !organizationId || !academyId) return;
    const current = pendingLogoStore.get(requestId);
    // The store, not this hook instance, is the guard: a second surface for
    // the same request never starts a second upload.
    if (!current || current.state === 'uploading') return;
    pendingLogoStore.transition(requestId, 'uploading');
    void uploadAndAttach(organizationId, requestId, academyId, current.file)
      .then((updated) => {
        pendingLogoStore.clear(requestId);
        queryClient.setQueryData(
          provisioningKeys.detail(organizationId, requestId),
          updated
        );
      })
      .catch(() => {
        pendingLogoStore.transition(requestId, 'failed');
      });
  }, [requestId, organizationId, academyId, queryClient]);

  useEffect(() => {
    if (serverLogo === 'attached' && requestId) {
      pendingLogoStore.clear(requestId);
      return;
    }
    if (serverLogo === 'awaiting_upload' && entry?.state === 'waiting') {
      start();
    }
  }, [serverLogo, entry?.state, requestId, start]);

  let state: LogoUploadState;
  if (serverLogo === 'none') state = 'none';
  else if (serverLogo === 'attached') state = 'attached';
  else if (!entry) state = 'missing';
  else if (entry.state === 'waiting') state = 'waiting';
  else state = entry.state;

  const retry = useCallback(() => {
    if (requestId) pendingLogoStore.transition(requestId, 'waiting');
  }, [requestId]);

  return { state, retry };
}
