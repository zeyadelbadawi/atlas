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

export interface UseApiMutationOptions<TData, TVariables, TError = Error, TContext = unknown>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
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

export function useApiMutation<TData, TVariables, TError = Error, TContext = unknown>(
  options: UseApiMutationOptions<TData, TVariables, TError, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { notifySuccess, notifyError } = useToast();
  const { t } = useTranslation();

  const {
    successMessageKey,
    errorMessageKey,
    showSuccessToast = true,
    showErrorToast = true,
    invalidateKeys,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      // Show success toast.
      if (showSuccessToast && successMessageKey) {
        notifySuccess(successMessageKey, undefined, undefined);
      }

      // Invalidate specified queries.
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key as unknown[] })
          )
        );
      }

      // Call user-provided onSuccess.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await onSuccess?.(data, variables, context, undefined as any);
    },
    onError: (error, variables, context) => {
      // Show error toast.
      if (showErrorToast) {
        notifyError(errorMessageKey ?? 'errors:mutation.failed', undefined, undefined);
      }

      // Call user-provided onError.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError?.(error, variables, context, undefined as any);
    },
  });
}