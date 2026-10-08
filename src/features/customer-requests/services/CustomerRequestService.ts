/**
 * Customer Request Service — an academy's own requests to the Atlas team.
 *
 * `academies/:academyId/customer-requests/*` is guarded server-side by a
 * real session on the management surface, verified academy membership and
 * the owner/administrator academy role (`AcademyRoles`), and is allowed
 * while a subscription is inactive. Hiding the UI for other roles is a
 * convenience, never the control.
 *
 * `create` carries a `clientRequestId` the dialog generates once per open:
 * a retried submit (a double click, a dropped connection) returns the
 * request already created instead of filing a second one.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type { PaginatedResult } from '@types';
import type {
  CreateCustomerRequestPayload,
  CustomerRequestDetail,
  CustomerRequestFilters,
  CustomerRequestListQuery,
  CustomerRequestSummary,
} from '../types/customer-request.types';

export class CustomerRequestService extends BaseService {
  protected readonly resource = 'academies';

  private requestsPath(
    academyId: string,
    ...segments: readonly string[]
  ): string {
    return this.path(academyId, 'customer-requests', ...segments);
  }

  /** `POST academies/:academyId/customer-requests`. */
  async create(
    academyId: string,
    payload: CreateCustomerRequestPayload,
    options?: WriteOptions
  ): Promise<CustomerRequestDetail> {
    return this.client.post<
      CustomerRequestDetail,
      CreateCustomerRequestPayload
    >(this.requestsPath(academyId), payload, options);
  }

  /** `GET academies/:academyId/customer-requests` — one page. */
  async list(
    academyId: string,
    query?: CustomerRequestListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<CustomerRequestSummary>> {
    return this.client.get<PaginatedResult<CustomerRequestSummary>>(
      this.requestsPath(academyId),
      {
        ...options,
        params: {
          ...toCollectionParams<CustomerRequestFilters>(query),
          ...options?.params,
        },
      }
    );
  }

  /** `GET academies/:academyId/customer-requests/:requestId` — customer-visible history only. */
  async get(
    academyId: string,
    requestId: string,
    options?: ReadOptions
  ): Promise<CustomerRequestDetail> {
    return this.client.get<CustomerRequestDetail>(
      this.requestsPath(academyId, requestId),
      options
    );
  }

  /** `POST academies/:academyId/customer-requests/:requestId/messages`. */
  async reply(
    academyId: string,
    requestId: string,
    body: string,
    options?: WriteOptions
  ): Promise<CustomerRequestDetail> {
    return this.client.post<CustomerRequestDetail, { readonly body: string }>(
      this.requestsPath(academyId, requestId, 'messages'),
      { body },
      options
    );
  }

  /** `POST academies/:academyId/customer-requests/:requestId/cancel`. */
  async cancel(
    academyId: string,
    requestId: string,
    options?: WriteOptions
  ): Promise<CustomerRequestDetail> {
    return this.client.post<CustomerRequestDetail, Record<string, never>>(
      this.requestsPath(academyId, requestId, 'cancel'),
      {},
      options
    );
  }
}

export const customerRequestService = new CustomerRequestService();
