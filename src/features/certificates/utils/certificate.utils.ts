/**
 * Certificate presentation helpers (P64 Phase 3, D6/D7).
 *
 * Status and render-state tones live here so the learner cards, the staff
 * table and the detail dialog can never disagree about what "revoked"
 * looks like.
 */
import type { StatusTone } from '@components/data-display';
import type { CertificateRenderState, CertificateStatusValue } from '@types';

export function certificateStatusTone(
  status: CertificateStatusValue
): StatusTone {
  return status === 'revoked' ? 'destructive' : 'success';
}

export function certificateStatusLabelKey(
  status: CertificateStatusValue
): string {
  return `certificates:status.${status}`;
}

export function certificateRenderTone(
  state: CertificateRenderState
): StatusTone {
  switch (state) {
    case 'ready':
      return 'success';
    case 'failed':
      return 'destructive';
    default:
      return 'warning';
  }
}

export function certificateRenderLabelKey(
  state: CertificateRenderState
): string {
  return `certificates:render.${state}`;
}

/**
 * The public verification URL on the host the page is being viewed on.
 *
 * Unprefixed (`/verify/…`, never `/ar/verify/…`): both locale trees mount
 * the same page, and a link that is shared should not carry the sharer's
 * language. The raw code goes in the path — the display form (dashed) is
 * for humans to read and type.
 */
export function buildVerifyUrl(verificationCode: string): string {
  return `${window.location.origin}/verify/${encodeURIComponent(verificationCode)}`;
}

/**
 * Opens a freshly minted signed link in a new tab without handing the
 * opener to it. Returns false when the browser refused (popup blocked), so
 * the caller can fall back to a visible link.
 */
export function openInNewTab(url: string): boolean {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return opened !== null;
}
