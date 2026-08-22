/**
 * Reads the global loading service.
 */
import { useContext } from 'react';
import { LoadingContext } from './loading.context';
import type { LoadingContextValue } from './loading.context';

export function useGlobalLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error(
      'useGlobalLoading must be used within AtlasLoadingProvider.'
    );
  }

  return context;
}