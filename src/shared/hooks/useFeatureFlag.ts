/**
 * useFeatureFlag hook.
 *
 * Evaluates a feature flag for the current context.
 */
import { usePlatform } from './usePlatform';

export function useFeatureFlag(flagKey: string): boolean {
  const { isFeatureEnabled } = usePlatform();
  return isFeatureEnabled(flagKey);
}