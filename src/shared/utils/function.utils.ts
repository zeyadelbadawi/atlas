/**
 * Function scheduling helpers.
 *
 * Framework-independent so they can be reused by services and utilities, not
 * only by React components.
 */

/** A function whose arguments are preserved by the wrappers below. */
type AnyFunction = (...args: never[]) => void;

/** A scheduled wrapper with an escape hatch to stop pending work. */
export interface ScheduledFunction<TFunction extends AnyFunction> {
  (...args: Parameters<TFunction>): void;
  /** Discards any pending invocation. */
  cancel: () => void;
}

/**
 * Delays invocation until `waitMs` has elapsed since the last call.
 *
 * Use for work that should only run once the user has finished acting, such as
 * issuing a search request while typing.
 */
export function debounce<TFunction extends AnyFunction>(
  callback: TFunction,
  waitMs: number
): ScheduledFunction<TFunction> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Parameters<TFunction>): void => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      callback(...args);
    }, waitMs);
  };

  debounced.cancel = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

/**
 * Limits invocation to at most once per `intervalMs`, running immediately on
 * the leading edge and once more on the trailing edge if calls continued.
 *
 * Use for continuous events such as scroll or resize.
 */
export function throttle<TFunction extends AnyFunction>(
  callback: TFunction,
  intervalMs: number
): ScheduledFunction<TFunction> {
  let lastInvocationTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let pendingArgs: Parameters<TFunction> | undefined;

  const invoke = (args: Parameters<TFunction>): void => {
    lastInvocationTime = Date.now();
    callback(...args);
  };

  const throttled = (...args: Parameters<TFunction>): void => {
    const elapsed = Date.now() - lastInvocationTime;

    if (elapsed >= intervalMs) {
      invoke(args);
      return;
    }

    pendingArgs = args;
    if (timeoutId !== undefined) return;

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (pendingArgs) {
        invoke(pendingArgs);
        pendingArgs = undefined;
      }
    }, intervalMs - elapsed);
  };

  throttled.cancel = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    pendingArgs = undefined;
  };

  return throttled;
}

/** A no-op used as a safe default for optional callbacks. */
export function noop(): void {
  // Intentionally empty.
}