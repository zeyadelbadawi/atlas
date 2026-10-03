/**
 * useSubmitPlatformContact — sends the marketing contact form.
 *
 * A plain mutation, deliberately without the shared toast behaviour of
 * `useApiMutation`: the form renders its own inline success and failure
 * states, where a visitor is already looking, and announces them through
 * live regions. Never retried automatically — a retried POST could be a
 * duplicate message (the server deduplicates, but the visitor should
 * decide to resend).
 */
import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@api';
import {
  platformContactService,
  type PlatformContactPayload,
  type PlatformContactReceipt,
} from '../services/PlatformContactService';

export function useSubmitPlatformContact() {
  return useMutation<PlatformContactReceipt, ApiError, PlatformContactPayload>({
    mutationFn: (payload) => platformContactService.submit(payload),
    retry: false,
  });
}
