/**
 * useFormSubmit hook.
 *
 * Integrates form submission with mutations, loading state and error handling.
 * Use this to connect a form to a backend operation.
 */
import { useCallback } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useApiMutation } from '@hooks';
import type { UseApiMutationOptions } from '@hooks/useApiMutation';

export interface UseFormSubmitOptions<TData, TVariables extends FieldValues>
  extends Omit<UseApiMutationOptions<TData, TVariables>, 'mutationFn'> {
  /** The mutation function to execute. */
  readonly mutationFn: (variables: TVariables) => Promise<TData>;

  /** Callback invoked on successful submission. */
  readonly onSuccess?: (data: TData, variables: TVariables) => void;

  /** Whether to reset the form after successful submission. Default: false. */
  readonly resetOnSuccess?: boolean;
}

export function useFormSubmit<TData, TVariables extends FieldValues>(
  form: UseFormReturn<TVariables>,
  options: UseFormSubmitOptions<TData, TVariables>
) {
  const { mutationFn, onSuccess, resetOnSuccess = false, ...mutationOptions } =
    options;

  const mutation = useApiMutation<TData, TVariables>({
    mutationFn,
    ...mutationOptions,
    onSuccess: (data, variables) => {
      if (resetOnSuccess) {
        form.reset();
      }
      onSuccess?.(data, variables);
    },
  });

  const handleSubmit = useCallback(
    (onValid: (data: TVariables) => void | Promise<void>) => {
      return form.handleSubmit(async (data) => {
        await onValid(data);
      });
    },
    [form]
  );

  const submitForm = useCallback(
    async (data: TVariables) => {
      await mutation.mutateAsync(data);
    },
    [mutation]
  );

  return {
    ...mutation,
    handleSubmit,
    submitForm,
    isSubmitting: mutation.isPending,
  };
}