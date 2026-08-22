/**
 * Manual Transfer Provider.
 *
 * The one concrete `PaymentProviderAdapter` implementation today, backing
 * BOTH `manual_bank_transfer` and `manual_wallet_transfer` payment methods
 * (they differ only in which `ManualPaymentInstructions` the catalog
 * publishes for a given `PaymentMethod` — not in how the payment itself is
 * created, checked or proven). Every method here calls Atlas's own
 * `PaymentService` — never a real bank/wallet API. There is no such thing
 * as "connecting to" a bank transfer; a human reviews it (see
 * `PlatformPaymentService`).
 */
import type {
  Checkout,
  Payment,
} from '@types';
import type {
  ManualReviewPaymentProviderAdapter,
  PaymentProviderCapabilities,
} from './PaymentProviderAdapter';
import { paymentService } from '../services/PaymentService';
import { readFileAsDataUrl } from '../utils/file.utils';

const MANUAL_TRANSFER_CAPABILITIES: PaymentProviderCapabilities = Object.freeze({
  supportsManualReview: true,
  supportsProof: true,
  supportsRedirect: false,
  supportsEmbeddedCheckout: false,
  supportsAdditionalAuthentication: false,
  supportsWebhooks: false,
  supportsRefunds: false,
  supportsRecurring: false,
  supportsCancellation: true,
});

export class ManualTransferProvider implements ManualReviewPaymentProviderAdapter {
  readonly providerKey = 'atlas_manual';
  readonly capabilities = MANUAL_TRANSFER_CAPABILITIES;

  async createPayment(checkout: Checkout, methodKey: string): Promise<Payment> {
    return paymentService.createPayment(checkout.organizationId, {
      checkoutId: checkout.id,
      methodKey,
    });
  }

  async getPaymentStatus(organizationId: string, paymentId: string): Promise<Payment> {
    return paymentService.getPayment(organizationId, paymentId);
  }

  async cancelPayment(organizationId: string, paymentId: string): Promise<Payment> {
    return paymentService.cancelPayment(organizationId, paymentId);
  }

  async submitProof(
    organizationId: string,
    paymentId: string,
    file: File,
    note?: string
  ): Promise<Payment> {
    const fileData = await readFileAsDataUrl(file);
    return paymentService.submitProof(organizationId, paymentId, {
      fileData,
      fileName: file.name,
      mimeType: file.type,
      note,
    });
  }
}

/** Singleton instance, registered in `PaymentProviderRegistry`. */
export const manualTransferProvider = new ManualTransferProvider();
