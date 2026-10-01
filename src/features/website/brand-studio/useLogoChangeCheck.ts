/**
 * "Your logo changed" detection (Theme 1 plan §F.4.6).
 *
 * A saved palette records the sha256 of the logo it was extracted from
 * (`extraction.logoFingerprint`). When the Academy's logo is replaced
 * somewhere else (Academy Branding), a confirmed or overridden palette is
 * never re-derived silently; the Brand tab offers a review instead. This
 * hook reads the current logo's bytes and reports whether they differ
 * from the recorded fingerprint. Any failure (network, CORS on a legacy
 * external URL, an unreadable file) simply reports "unchanged": the
 * suggestion is an offer, never a blocker.
 */
import { useEffect, useState } from 'react';
import { inspectLogoFile } from './logo-file';

interface CurrentLogo {
  readonly url: string;
  readonly blob: Blob;
  readonly fingerprint: string;
}

export interface LogoChangeCheck {
  /** The current logo differs from the one the palette was built from. */
  readonly changed: boolean;
  /** The current logo's bytes, ready for `analyzeFile`, once read. */
  readonly logo: Blob | null;
}

export function useLogoChangeCheck(
  logoUrl: string | undefined,
  recordedFingerprint: string | undefined
): LogoChangeCheck {
  const [current, setCurrent] = useState<CurrentLogo | null>(null);
  const shouldCheck = !!logoUrl && !!recordedFingerprint;

  useEffect(() => {
    if (!shouldCheck || !logoUrl) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(logoUrl, { signal: controller.signal });
        if (!response.ok) return;
        const blob = await response.blob();
        const inspected = await inspectLogoFile(blob);
        if (controller.signal.aborted || !inspected.ok) return;
        setCurrent({
          url: logoUrl,
          blob,
          fingerprint: inspected.logo.fingerprint,
        });
      } catch {
        // Unreadable here (offline, cross-origin legacy URL): no suggestion.
      }
    })();
    return () => controller.abort();
  }, [logoUrl, shouldCheck]);

  const matchesUrl = !!current && current.url === logoUrl;
  return {
    changed:
      shouldCheck && matchesUrl && current.fingerprint !== recordedFingerprint,
    logo: matchesUrl ? current.blob : null,
  };
}
