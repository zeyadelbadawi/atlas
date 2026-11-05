/**
 * useApiMutation hook.
 *
 * Wraps TanStack Query's useMutation with Atlas-specific defaults and integrates
 * with toast notifications for success/error feedback.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useToast } from '@app/providers';
import { useTranslation } from 'react-i18next';
import { invalidateQueryPrefixes } from '@services/query/query-utils';
import { INLINE_ERRORS_META } from '@services/query/query-client';
import { normalizeUnknownError } from '@services';
import { mutationErrorToast } from './mutation-error-toast';

export interface UseApiMutationOptions<
  TData,
  TVariables,
  TError = Error,
  TContext = unknown,
> extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /** Translation key for success toast message. */
  readonly successMessageKey?: string;

  /** Translation key for error toast message. */
  readonly errorMessageKey?: string;

  /** Whether to show success toast. Default: true. */
  readonly showSuccessToast?: boolean;

  /** Whether to show error toast. Default: true. */
  readonly showErrorToast?: boolean;

  /** Query keys to invalidate on success. */
  readonly invalidateKeys?: readonly (readonly unknown[])[];
}

export function useApiMutation<
  TData,
  TVariables,
  TError = Error,
  TContext = unknown,
>(
  options: UseApiMutationOptions<TData, TVariables, TError, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { notifySuccess, notifyError } = useToast();
  const { i18n } = useTranslation();

  const {
    successMessageKey,
    errorMessageKey,
    showSuccessToast = true,
    showErrorToast = true,
    invalidateKeys,
    onSuccess,
    onError,
    meta,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    // B0 — this hook shows the failure itself (one toast, with the real
    // reason), so the app-wide reporter must not add a second one.
    meta: showErrorToast ? { ...meta, [INLINE_ERRORS_META]: true } : meta,
    onSuccess: async (data, variables, context) => {
      // Show success toast.
      if (showSuccessToast && successMessageKey) {
        notifySuccess(successMessageKey, undefined, undefined);
      }

      // Invalidate specified queries. Each key is treated as a prefix with
      // trailing `undefined`s dropped, so `list(scope)` also matches the
      // `list(scope, query)` entries a screen actually cached.
      if (invalidateKeys) {
        await invalidateQueryPrefixes(queryClient, invalidateKeys);
      }

      // Call user-provided onSuccess.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await onSuccess?.(data, variables, context, undefined as any);
    },
    onError: (error, variables, context) => {
      // Show error toast.
      if (showErrorToast) {
        const toast = mutationErrorToast(normalizeUnknownError(error), {
          errorMessageKey,
          // Without an i18n provider (isolated tests) nothing is known to
          // exist, so the per-kind fallback copy is used, never a raw key.
          exists: (key) => typeof i18n?.exists === 'function' && i18n.exists(key),
          online: typeof navigator === 'undefined' || navigator.onLine !== false,
        });
        if (toast) notifyError(toast.titleKey, toast.descriptionKey, toast.values);
      }

      // Call user-provided onError.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError?.(error, variables, context, undefined as any);
    },
  });
}
