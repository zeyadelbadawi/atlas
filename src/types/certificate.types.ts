/**
 * Certificate types (P64 Phase 3, D6/D7).
 *
 * Mirrors `certificate.contract.ts` (backend). A certificate is issued
 * once per enrollment, carries a per-academy serial and a 12-character
 * verification code, and is immutable: a later retake never changes it,
 * and a name or template change only ever produces a new VERSION under
 * the same serial and code.
 */

export type CertificateStatusValue = 'issued' | 'revoked';
export type CertificateRenderState = 'pending' | 'ready' | 'failed';

export interface Certificate {
  readonly id: string;
  readonly academyId: string;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly courseSlug: string;
  readonly enrollmentId: string;
  readonly studentId: string;
  readonly studentName: string;
  /** Staff lists only. */
  readonly studentEmail?: string;
  readonly serial: string;
  readonly verificationCode: string;
  /** `ABCD-EFGH-JK23` — the code as it is printed and typed. */
  readonly verificationCodeDisplay: string;
  readonly status: CertificateStatusValue;
  readonly version: number;
  readonly locale: string;
  readonly issuedAt: string;
  readonly issuedManually: boolean;
  readonly revokedAt: string | null;
  readonly revokeReason: string | null;
  readonly renderStatus: CertificateRenderState;
  readonly renderedAt: string | null;
  readonly completedAt: string | null;
  readonly overallScore: number | null;
  readonly learnerNameOnCertificate: string;
}

/** A one-hour signed link to the rendered PDF. */
export interface CertificateDownload {
  readonly certificateId: string;
  readonly url: string;
  readonly expiresAt: string;
  readonly fileName: string;
}

export interface CertificateDetail extends Certificate {
  readonly download: CertificateDownload | null;
}

export interface LearnerCertificatesResponse {
  /** False while the `certificates` flag does not admit this academy. */
  readonly enabled: boolean;
  readonly items: readonly Certificate[];
}

/**
 * Public verification. `valid: false` carries nothing else — an unknown
 * code and a malformed one look identical, by design.
 */
export interface CertificateVerification {
  readonly valid: boolean;
  readonly status?: CertificateStatusValue;
  readonly serial?: string;
  readonly issuedTo?: string;
  readonly courseTitle?: string;
  readonly academyName?: string;
  readonly academySlug?: string;
  readonly issuedAt?: string;
  readonly completedAt?: string | null;
  readonly revokedAt?: string | null;
  readonly version?: number;
}

export interface CertificateWording {
  readonly title: string;
  readonly body: string;
}

export interface CertificateWordingByLocale {
  readonly en: CertificateWording;
  readonly ar: CertificateWording;
}

/** The four author-controlled certificate colour roles (hex strings). */
export interface CertificatePalette {
  readonly primary: string;
  readonly accent: string;
  readonly text: string;
  readonly background: string;
}

export interface CertificateTemplate {
  readonly id: string;
  readonly academyId: string;
  readonly name: string;
  readonly logoUrl: string | null;
  readonly signatureUrl: string | null;
  readonly signatoryName: string | null;
  readonly signatoryTitle: string | null;
  readonly wording: CertificateWordingByLocale;
  readonly palette: CertificatePalette;
  readonly version: number;
  readonly isDefault: boolean;
  readonly updatedAt: string;
}

export interface UpdateCertificateTemplatePayload {
  readonly name?: string;
  readonly logoUrl?: string | null;
  readonly signatureUrl?: string | null;
  readonly signatoryName?: string | null;
  readonly signatoryTitle?: string | null;
  readonly wording?: {
    readonly en?: Partial<CertificateWording>;
    readonly ar?: Partial<CertificateWording>;
  };
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly textColor?: string;
  readonly backgroundColor?: string;
}

export interface ListCertificatesQuery {
  readonly courseId?: string;
  readonly status?: CertificateStatusValue;
}

export interface RevokeCertificatePayload {
  readonly reason: string;
}

export interface RegenerateCertificatePayload {
  readonly reason?: string;
}

export interface IssueCertificatePayload {
  readonly reason?: string;
  /** Issue even when the eligibility evaluator says no (owner / manager only). */
  readonly force?: boolean;
}
