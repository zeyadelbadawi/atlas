/**
 * The content signature that drives the certificate editor's live preview.
 *
 * The preview must re-render whenever ANY editable field changes, including
 * the NESTED wording (title/body, EN and AR). react-hook-form keeps the
 * nested `wording` object reference stable across keystrokes, so a preview
 * key memoised on that reference never noticed text edits — only the
 * top-level colour strings changed, which is exactly the "text edits don't
 * update the preview" bug. Building the key from the actual CONTENT (a deep
 * JSON serialisation) makes a single typed character in any field produce a
 * new key, which triggers a fresh server-rendered preview.
 */
export interface CertificatePreviewKeyInput {
  readonly locale: 'en' | 'ar';
  readonly logoUrl?: string | null;
  readonly signatureUrl?: string | null;
  readonly signatoryName?: string | null;
  readonly signatoryTitle?: string | null;
  readonly wording?: {
    readonly en?: { readonly title?: string; readonly body?: string };
    readonly ar?: { readonly title?: string; readonly body?: string };
  };
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly textColor?: string;
  readonly backgroundColor?: string;
}

export function buildCertificatePreviewKey(
  input: CertificatePreviewKeyInput
): string {
  return JSON.stringify({
    l: input.locale,
    logoUrl: input.logoUrl,
    signatureUrl: input.signatureUrl,
    signatoryName: input.signatoryName,
    signatoryTitle: input.signatoryTitle,
    wording: input.wording,
    primaryColor: input.primaryColor,
    accentColor: input.accentColor,
    textColor: input.textColor,
    backgroundColor: input.backgroundColor,
  });
}
