/**
 * Academy Payments Service — Academy Manual Payments, the Client Owner's side:
 *
 *   - `academies/:id/payment-methods[/<type>]` — the manual methods (bank
 *     transfer, InstaPay, mobile wallet) THIS academy accepts, with the
 *     details its learners are shown;
 *   - `academies/:id/course-payments[/:paymentId[/approve|reject|proof/file]]`
 *     — the payments learners made with them, reviewed here.
 *
 * Organization Owner only, server-side (`assertCanViewAcademyFinance`); a
 * manager or instructor gets 403, which the pages render as a permission
 * state. The proof is fetched as an authenticated Blob — never linked by URL.
 */
import { BaseService, resourcePath, toCollectionParams } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import {
  ACADEMY_PAYMENT_METHOD_SEGMENTS,
  type AcademyCoursePayment,
  type AcademyCoursePaymentCounts,
  type AcademyCoursePaymentDetail,
  type AcademyCoursePaymentListQuery,
  type AcademyPaymentMethod,
  type ApproveAcademyCoursePaymentPayload,
  type PaginatedResult,
  type RejectAcademyCoursePaymentPayload,
  type SaveAcademyPaymentMethodPayload,
} from '@types';

export type AcademyCoursePaymentPage = PaginatedResult<AcademyCoursePayment> & {
  readonly counts: AcademyCoursePaymentCounts;
};

export class AcademyPaymentsService extends BaseService {
  protected readonly resource = 'academies';

  async getMethods(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyPaymentMethod[]> {
    return this.client.get<AcademyPaymentMethod[]>(
      resourcePath('academies', academyId, 'payment-methods'),
      options
    );
  }

  /** Creates or updates one method; omitting `instructions` only switches it on or off. */
  async saveMethod(
    academyId: string,
    payload: SaveAcademyPaymentMethodPayload,
    options?: WriteOptions
  ): Promise<AcademyPaymentMethod> {
    const { type, ...body } = payload;
    return this.client.put<AcademyPaymentMethod, typeof body>(
      resourcePath(
        'academies',
        academyId,
        'payment-methods',
        ACADEMY_PAYMENT_METHOD_SEGMENTS[type]
      ),
      body,
      options
    );
  }

  async getPayments(
    academyId: string,
    query?: AcademyCoursePaymentListQuery,
    options?: ReadOptions
  ): Promise<AcademyCoursePaymentPage> {
    return this.client.get<AcademyCoursePaymentPage>(
      resourcePath('academies', academyId, 'course-payments'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  async getPayment(
    academyId: string,
    paymentId: string,
    options?: ReadOptions
  ): Promise<AcademyCoursePaymentDetail> {
    return this.client.get<AcademyCoursePaymentDetail>(
      resourcePath('academies', academyId, 'course-payments', paymentId),
      options
    );
  }

  async approvePayment(
    academyId: string,
    paymentId: string,
    payload: ApproveAcademyCoursePaymentPayload,
    options?: WriteOptions
  ): Promise<AcademyCoursePaymentDetail> {
    return this.client.post<
      AcademyCoursePaymentDetail,
      ApproveAcademyCoursePaymentPayload
    >(
      resourcePath(
        'academies',
        academyId,
        'course-payments',
        paymentId,
        'approve'
      ),
      payload,
      options
    );
  }

  async rejectPayment(
    academyId: string,
    paymentId: string,
    payload: RejectAcademyCoursePaymentPayload,
    options?: WriteOptions
  ): Promise<AcademyCoursePaymentDetail> {
    return this.client.post<
      AcademyCoursePaymentDetail,
      RejectAcademyCoursePaymentPayload
    >(
      resourcePath(
        'academies',
        academyId,
        'course-payments',
        paymentId,
        'reject'
      ),
      payload,
      options
    );
  }

  /** The learner's proof as an authenticated Blob (image or PDF). */
  async getProofFile(
    academyId: string,
    paymentId: string,
    options?: ReadOptions
  ): Promise<Blob> {
    return this.client.get<Blob>(
      resourcePath(
        'academies',
        academyId,
        'course-payments',
        paymentId,
        'proof',
        'file'
      ),
      { ...options, responseType: 'blob' }
    );
  }
}

export const academyPaymentsService = new AcademyPaymentsService();
