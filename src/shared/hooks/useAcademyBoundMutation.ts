/**
 * Academy-bound mutations (W5 — academy switching isolation, finding F9).
 *
 * THE BUG THIS PREVENTS. TanStack Query pushes a component's LATEST options
 * into a mutation that is still pending (`MutationObserver.setOptions`). A
 * hook that closed over a render-time `academyId` and wrote the cache in
 * `onSuccess`/`onMutate`/`onError` therefore wrote academy A's response (or
 * rollback) into academy B's cache if the screen re-rendered for B before
 * the request settled.
 *
 * THE RULE. An academy-scoped mutation carries its academy IN ITS VARIABLES
 * (`{ academyId, payload }`), and every callback reads it from there — the
 * pattern `useSaveVisualIdentity` established. Variables are fixed when the
 * user acts, so a save made in A always settles into A, whatever the
 * screen shows by then.
 *
 * `useAcademyBoundMutation` keeps existing call sites unchanged: it returns
 * the same mutation with `mutate(payload)` / `mutateAsync(payload)`, and
 * binds the hook's CURRENT academy into the variables at CALL time — the
 * academy the user was looking at when they clicked. Per-call callbacks
 * and `variables` see the bare payload, exactly as before.
 */
import { useCallback, useMemo } from 'react';
import type { MutateOptions, UseMutationResult } from '@tanstack/react-query';

/** The variables of an academy-scoped mutation. */
export interface AcademyScopedVariables<TPayload> {
  readonly academyId: string;
  readonly payload: TPayload;
}

type BoundOptions<TData, TError, TPayload, TContext> = MutateOptions<
  TData,
  TError,
  TPayload,
  TContext
>;

function unwrapOptions<TData, TError, TPayload, TContext>(
  options: BoundOptions<TData, TError, TPayload, TContext> | undefined
):
  | MutateOptions<TData, TError, AcademyScopedVariables<TPayload>, TContext>
  | undefined {
  if (!options) return undefined;
  return {
    onSuccess: options.onSuccess
      ? (data, variables, result, context) =>
          options.onSuccess?.(data, variables.payload, result, context)
      : undefined,
    onError: options.onError
      ? (error, variables, result, context) =>
          options.onError?.(error, variables.payload, result, context)
      : undefined,
    onSettled: options.onSettled
      ? (data, error, variables, result, context) =>
          options.onSettled?.(data, error, variables.payload, result, context)
      : undefined,
  };
}

export function useAcademyBoundMutation<TData, TError, TPayload, TContext>(
  mutation: UseMutationResult<
    TData,
    TError,
    AcademyScopedVariables<TPayload>,
    TContext
  >,
  academyId: string | undefined
): UseMutationResult<TData, TError, TPayload, TContext> {
  const { mutate: rawMutate, mutateAsync: rawMutateAsync } = mutation;

  const mutate = useCallback(
    (
      payload: TPayload,
      options?: BoundOptions<TData, TError, TPayload, TContext>
    ) =>
      rawMutate(
        { academyId: academyId ?? '', payload },
        unwrapOptions(options)
      ),
    [rawMutate, academyId]
  );

  const mutateAsync = useCallback(
    (
      payload: TPayload,
      options?: BoundOptions<TData, TError, TPayload, TContext>
    ) =>
      rawMutateAsync(
        { academyId: academyId ?? '', payload },
        unwrapOptions(options)
      ),
    [rawMutateAsync, academyId]
  );

  return useMemo(
    () =>
      ({
        ...mutation,
        mutate,
        mutateAsync,
        variables: mutation.variables?.payload,
      }) as unknown as UseMutationResult<TData, TError, TPayload, TContext>,
    [mutation, mutate, mutateAsync]
  );
}
