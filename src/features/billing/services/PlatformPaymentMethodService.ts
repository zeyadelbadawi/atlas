/**
 * Platform Payment Method Service (2 Oct 2026).
 *
 * Platform Owner configuration of the payment-method catalog —
 * `/platform-payment-methods`, a flat platform-owned resource like
 * `PlatformPaymentService`, never nested under `organizations/:id`.
 *
 * Manual methods only — bank transfer, Egyptian mobile wallets and
 * InstaPay — each through its own create endpoint: `type`, `provider` and
 * `capabilities` are fixed by the server and never sent. A method is never
 * deleted (existing payments keep its key); it is disabled instead. Every
 * detail comes from what the Platform Owner typed — this service never
 * fills one in.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  CreateBankTransferMethodPayload,
  CreateInstapayMethodPayload,
  CreateWalletMethodPayload,
  PaginatedResult,
  PlatformPaymentMethod,
  UpdatePlatformPaymentMethodPayload,
} from '@types';

export class PlatformPaymentMethodService extends BaseService {
  protected readonly resource = 'platform-payment-methods';

  /** Every payment method, enabled or not. */
  async getPaymentMethods(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformPaymentMethod>> {
    return this.fetchCollection<PlatformPaymentMethod>(query, options);
  }

  /** Creates a bank-transfer method. Saved disabled unless `enabled` is sent. */
  async createBankTransferMethod(
    payload: CreateBankTransferMethodPayload,
    options?: WriteOptions
  ): Promise<PlatformPaymentMethod> {
    return this.client.post<
      PlatformPaymentMethod,
      CreateBankTransferMethodPayload
    >(this.path('bank-transfer'), payload, options);
  }

  /** Creates an e-wallet method (Vodafone Cash, Orange Cash, …). Saved disabled unless `enabled` is sent. */
  async createWalletMethod(
    payload: CreateWalletMethodPayload,
    options?: WriteOptions
  ): Promise<PlatformPaymentMethod> {
    return this.client.post<PlatformPaymentMethod, CreateWalletMethodPayload>(
      this.path('wallet'),
      payload,
      options
    );
  }

  /** Creates an InstaPay method. Saved disabled unless `enabled` is sent. */
  async createInstapayMethod(
    payload: CreateInstapayMethodPayload,
    options?: WriteOptions
  ): Promise<PlatformPaymentMethod> {
    return this.client.post<
      PlatformPaymentMethod,
      CreateInstapayMethodPayload
    >(this.path('instapay'), payload, options);
  }

  /** Updates any subset of a method's fields — including enabling or disabling it. */
  async updatePaymentMethod(
    methodId: string,
    payload: UpdatePlatformPaymentMethodPayload,
    options?: WriteOptions
  ): Promise<PlatformPaymentMethod> {
    return this.updateOne<
      PlatformPaymentMethod,
      UpdatePlatformPaymentMethodPayload
    >(methodId, payload, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformPaymentMethodService = new PlatformPaymentMethodService();
