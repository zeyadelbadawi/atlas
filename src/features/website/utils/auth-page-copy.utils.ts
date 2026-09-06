/**
 * Sign In/Sign Up heading copy — the one shared place that builds the
 * `header` patch for editing it.
 *
 * `header` is a full replace server-side (see `WebsiteConfigurationService`),
 * so any edit here MUST carry the existing `cta` forward explicitly, or
 * saving a title/subtitle would silently wipe whatever CTA an admin
 * already configured. Two surfaces edit this same data — the Navigation
 * tab's card and the Pages list's dialog — so this logic lives in exactly
 * one place rather than being duplicated (and risking the two drifting
 * out of sync the way `cta` vs. `authPages` preservation already once did).
 */
import type { LocalizedText, WebsiteConfiguration, WebsiteHeaderConfig } from '@types';

export type AuthPageKey = 'signIn' | 'signUp';
export type AuthPageCopyField = 'title' | 'subtitle';

/** An entirely blank `{en:'', ar:''}` clears the override back to the app's own default copy — matches the field's own pre-Phase-6 "empty string clears it" behavior, just at the `LocalizedText` level instead of a bare string. */
function isBlank(value: LocalizedText): boolean {
  return !value.en.trim() && !value.ar.trim();
}

export function buildAuthPageCopyHeaderPatch(
  configuration: WebsiteConfiguration,
  page: AuthPageKey,
  field: AuthPageCopyField,
  value: LocalizedText
): WebsiteHeaderConfig {
  const currentAuthPages = configuration.header.authPages;
  const nextCopy = { ...currentAuthPages?.[page], [field]: isBlank(value) ? undefined : value };

  return {
    cta: configuration.header.cta,
    authPages: { ...currentAuthPages, [page]: nextCopy },
  };
}
