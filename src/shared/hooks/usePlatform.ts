/**
 * usePlatform hook.
 *
 * Provides access to global platform state.
 */
import { useContext } from 'react';
import { PlatformContext } from '@app/providers/platform/platform.context';
import type { PlatformContextValue } from '@app/providers/platform/platform.context';

export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error('usePlatform must be used within AtlasPlatformProvider');
  }

  return context;
}