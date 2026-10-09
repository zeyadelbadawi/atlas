/**
 * What the forensic watermark draws, resolved from whatever the server sent
 * (backend `docs/FORENSIC_WATERMARK.md`).
 *
 * THE TEXT IS THE SERVER'S. The code and the masked identity are composed
 * server-side from the viewer's own session, so nothing here invents a
 * value: a grant from a backend that predates the structured fields still
 * carries the flat `text` label (`CODE · a•••@mail.com`), and that is drawn
 * verbatim rather than parsed into something it might not be.
 */
import type { ContentWatermark, ForensicWatermarkDisplay } from '@types';

export interface ResolvedWatermark {
  /** The forensic code, when the server sent one as a field. */
  readonly code: string | null;
  /** What the moving label leads with — the code, else the flat label. */
  readonly primary: string;
  /** The masked identity, or the academy host for an anonymous preview. */
  readonly secondary: string | null;
  readonly kind: 'account' | 'preview';
}

/** `null` when there is nothing to draw (no video, or a malformed grant). */
export function resolveWatermark(
  source: ContentWatermark | ForensicWatermarkDisplay | null | undefined
): ResolvedWatermark | null {
  if (!source) return null;
  if ('enabled' in source && !source.enabled) return null;

  const code =
    typeof source.code === 'string' && source.code ? source.code : null;
  const kind = source.kind === 'preview' ? 'preview' : 'account';

  if (code) {
    return {
      code,
      primary: code,
      secondary:
        kind === 'preview'
          ? (source.host ?? null)
          : (source.maskedIdentity ?? null),
      kind,
    };
  }

  const text = 'text' in source ? source.text.trim() : '';
  if (!text) return null;
  return { code: null, primary: text, secondary: null, kind };
}
