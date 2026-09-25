/**
 * Academy protection settings — error copy helpers (P64 Phase 2).
 *
 * Every protection endpoint is Client Owner only, reads included. The
 * shared `errors:academy.insufficientRole` copy says "ask an owner or
 * manager", which is wrong here (a Manager cannot change these either),
 * so that one refusal is mapped to protection-specific copy. Everything
 * else goes through `apiErrorMessage` — the backend's own `messageKey`
 * (`errors.entitlement.videoTierNotEntitled`,
 * `errors.academy.devicePolicyAboveMaximum`) has EN/AR copy in
 * `errors.json`.
 */
import type { TFunction, i18n as I18nInstance } from 'i18next';
import { apiErrorMessage, hasMessageKey } from '@utils';

export const INSUFFICIENT_ROLE_MESSAGE_KEY = 'errors.academy.insufficientRole';

/** True when the server refused because the viewer is not the academy's owner. */
export function isOwnerOnlyRefusal(error: unknown): boolean {
  return hasMessageKey(error, INSUFFICIENT_ROLE_MESSAGE_KEY);
}

export function protectionErrorMessage(
  t: TFunction,
  i18n: Pick<I18nInstance, 'exists'>,
  error: unknown,
  fallbackKey: string
): string {
  if (isOwnerOnlyRefusal(error)) return t('academy:protection.ownerOnly');
  return apiErrorMessage(t, i18n, error, { fallbackKey });
}
