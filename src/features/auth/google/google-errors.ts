/**
 * Google Identity — what a failed Google flow says to the person. Backend
 * keys arrive as `errors.auth.x`; a key this bundle does not carry falls
 * back to a generic "try again" rather than to an empty message.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '@api';
import { toErrorsNamespaceKey } from '@utils';

export const GOOGLE_ERROR_KEYS = {
  signInExpired: 'errors.auth.googleSignInExpired',
  emailUnverified: 'errors.auth.googleEmailUnverified',
  identityInUse: 'errors.auth.googleIdentityInUse',
  alreadyLinked: 'errors.auth.googleAlreadyLinked',
  linkFromSettings: 'errors.auth.googleLinkFromSettings',
  originRefused: 'errors.auth.googleOriginRefused',
  setPasswordFirst: 'errors.auth.setPasswordFirst',
  invalidCurrentPassword: 'errors.auth.invalidCurrentPassword',
  invalidCredentials: 'errors.auth.invalidCredentials',
  inviteRequired: 'errors.auth.inviteRequired',
  inviteInvalid: 'errors.auth.inviteInvalid',
} as const;

/**
 * Checked with `exists()` rather than `defaultValue`: this app's
 * `parseMissingKeyHandler` answers a missing key before a default would.
 */
export function useGoogleErrorMessage(): (
  error: Pick<ApiError, 'messageKey'> | null | undefined
) => string {
  const { t, i18n } = useTranslation();
  return useCallback(
    (error) => {
      const key = error?.messageKey;
      const bundleKey = key?.startsWith('errors.')
        ? toErrorsNamespaceKey(key)
        : undefined;
      return bundleKey && i18n.exists(bundleKey)
        ? t(bundleKey)
        : t('auth:google.errors.generic');
    },
    [t, i18n]
  );
}
