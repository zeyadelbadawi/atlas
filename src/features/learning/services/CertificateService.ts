/**
 * Certificate Service (P64 Phase 3, D6/D7).
 *
 * Three audiences, one service, because the object is the same:
 *   - the learner (`/learning/certificates*`) — their own, on the host academy;
 *   - anyone (`/verify/:code`) — the public fact sheet, no session;
 *   - academy staff (`/academies/:id/certificates*`, `/academies/:id/certificate-template`).
 *
 * A download is never a stored URL: `getDownload` mints a fresh one-hour
 * signed link each time, which is why the learner page fetches it on
 * click rather than rendering it into the list.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath, toCollectionParams } from '@api';
import type {
  Certificate,
  CertificateDetail,
  CertificateDownload,
  CertificateTemplate,
  CertificateVerification,
  CollectionQuery,
  IssueCertificatePayload,
  LearnerCertificatesResponse,
  ListCertificatesQuery,
  PaginatedResult,
  RegenerateCertificatePayload,
  RevokeCertificatePayload,
  UpdateCertificateTemplatePayload,
} from '@types';

export class CertificateService extends BaseService {
  protected readonly resource = 'learning';

  /* ---------- learner ---------- */

  async getMyCertificates(
    options?: ReadOptions
  ): Promise<LearnerCertificatesResponse> {
    return this.client.get<LearnerCertificatesResponse>(
      this.path('certificates'),
      options
    );
  }

  async getMyCertificate(
    certificateId: string,
    options?: ReadOptions
  ): Promise<CertificateDetail> {
    return this.client.get<CertificateDetail>(
      this.path('certificates', certificateId),
      options
    );
  }

  /** A fresh one-hour signed link to the PDF. */
  async getMyCertificateDownload(
    certificateId: string,
    options?: ReadOptions
  ): Promise<CertificateDownload> {
    return this.client.get<CertificateDownload>(
      this.path('certificates', certificateId, 'download'),
      options
    );
  }

  /* ---------- public ---------- */

  /** No session. Unknown and malformed codes both answer `{ valid: false }`. */
  async verify(
    code: string,
    options?: ReadOptions
  ): Promise<CertificateVerification> {
    return this.client.get<CertificateVerification>(
      resourcePath('verify', code),
      options
    );
  }

  /* ---------- academy staff ---------- */

  async listForAcademy(
    academyId: string,
    query?: CollectionQuery,
    filters?: ListCertificatesQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Certificate>> {
    return this.client.get<PaginatedResult<Certificate>>(
      resourcePath('academies', academyId, 'certificates'),
      {
        ...options,
        params: {
          ...toCollectionParams(query),
          ...(filters?.courseId ? { courseId: filters.courseId } : {}),
          ...(filters?.status ? { status: filters.status } : {}),
          ...options?.params,
        },
      }
    );
  }

  async getForAcademy(
    academyId: string,
    certificateId: string,
    options?: ReadOptions
  ): Promise<CertificateDetail> {
    return this.client.get<CertificateDetail>(
      resourcePath('academies', academyId, 'certificates', certificateId),
      options
    );
  }

  async revoke(
    academyId: string,
    certificateId: string,
    payload: RevokeCertificatePayload,
    options?: WriteOptions
  ): Promise<Certificate> {
    return this.client.post<Certificate, RevokeCertificatePayload>(
      resourcePath(
        'academies',
        academyId,
        'certificates',
        certificateId,
        'revoke'
      ),
      payload,
      options
    );
  }

  /** Explicit, versioned (D7): same serial and code, a new snapshot and PDF. */
  async regenerate(
    academyId: string,
    certificateId: string,
    payload: RegenerateCertificatePayload,
    options?: WriteOptions
  ): Promise<Certificate> {
    return this.client.post<Certificate, RegenerateCertificatePayload>(
      resourcePath(
        'academies',
        academyId,
        'certificates',
        certificateId,
        'regenerate'
      ),
      payload,
      options
    );
  }

  async issueManually(
    academyId: string,
    enrollmentId: string,
    payload: IssueCertificatePayload,
    options?: WriteOptions
  ): Promise<Certificate> {
    return this.client.post<Certificate, IssueCertificatePayload>(
      resourcePath(
        'academies',
        academyId,
        'enrollments',
        enrollmentId,
        'certificate'
      ),
      payload,
      options
    );
  }

  async getTemplate(
    academyId: string,
    options?: ReadOptions
  ): Promise<CertificateTemplate> {
    return this.client.get<CertificateTemplate>(
      resourcePath('academies', academyId, 'certificate-template'),
      options
    );
  }

  async updateTemplate(
    academyId: string,
    payload: UpdateCertificateTemplatePayload,
    options?: WriteOptions
  ): Promise<CertificateTemplate> {
    return this.client.put<
      CertificateTemplate,
      UpdateCertificateTemplatePayload
    >(
      resourcePath('academies', academyId, 'certificate-template'),
      payload,
      options
    );
  }
}

export const certificateService = new CertificateService();
