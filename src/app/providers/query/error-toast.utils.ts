/**
 * Picks the description a global error toast should carry.
 *
 * The backend answers with dotted keys (`errors.tenancy.notAMember`), the
 * catalogue is the `errors` i18n namespace (`errors:tenancy.notAMember`),
 * and passing the dotted form to `t()` resolved it in the default namespace
 * instead — the toast then showed the literal key to the customer. Seen
 * live on 22 Sep 2026: "You do not have access / errors.tenancy.notAMember".
 *
 * A key the catalogue does not hold falls back to the per-kind message, so
 * a raw identifier never reaches the screen.
 */
import { errorMessageKey } from '@services';
import type { ApiError } from '@services';
import { toErrorsNamespaceKey } from '@utils';

export function errorToastDescriptionKey(
  error: Pick<ApiError, 'kind' | 'messageKey'>,
  exists: (key: string) => boolean
): string {
  const namespaced = toErrorsNamespaceKey(error.messageKey);
  return exists(namespaced) ? namespaced : errorMessageKey(error.kind);
}
