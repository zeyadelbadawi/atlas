/**
 * useAuth hook.
 *
 * Provides access to authentication state and operations. Every component that
 * needs to know about the current user or session should use this hook.
 */
import { useContext } from 'react';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';

export function useAuth(): IdentityContextValue {
  const context = useContext(IdentityContext);

  if (!context) {
    throw new Error('useAuth must be used within AtlasIdentityProvider');
  }

  return context;
}