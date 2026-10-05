/**
 * Academy Manual Payments — an academy's OWN manual payment methods (bank
 * transfer, InstaPay, mobile wallet), the Client Owner's review of what
 * learners paid with them, and the learner's own payment history.
 *
 * Mirrors the backend contracts:
 *   - `academy-payment-method.contract.ts`  (`academies/:id/payment-methods`)
 *   - `academy-course-payment.contract.ts`  (`academies/:id/course-payments`)
 *   - `learner-course-payment.contract.ts`  (`course-payments`)
 *
 * Method details are the same `ManualPaymentInstructions` shapes the
 * platform catalog uses, validated by the same rules server-side.
 */
import type { Money } from './money.types';
import type {
  BankTransferInstructionsPayload,
  InstapayInstructionsPayload,
  ManualPaymentInstructions,
  ManualReviewStatus,
  PaymentLifecycleStatus,
  WalletInstructionsPayload,
} from './payment.types';
import type { CollectionQuery } from './api.types';

/** The three manual method types an academy can accept. */
export const ACADEMY_PAYMENT_METHOD_TYPES = [
  'manual_bank_transfer',
  'manual_instapay',
  'manual_wallet_transfer',
] as const;
export type AcademyPaymentMethodType =
  (typeof ACADEMY_PAYMENT_METHOD_TYPES)[number];

/** The route segment each type is saved under (`PUT …/payment-methods/<segment>`). */
export const ACADEMY_PAYMENT_METHOD_SEGMENTS: Readonly<
  Record<AcademyPaymentMethodType, 'bank-transfer' | 'instapay' | 'wallet'>
> = {
  manual_bank_transfer: 'bank-transfer',
  manual_instapay: 'instapay',
  manual_wallet_transfer: 'wallet',
};

export interface AcademyPaymentMethod {
  readonly id: string;
  readonly academyId: string;
  /** `academy_<type>` — what a learner's checkout sends as `methodKey`. */
  readonly key: string;
  readonly type: AcademyPaymentMethodType;
  readonly enabled: boolean;
  readonly instructions: ManualPaymentInstructions;
  readonly displayOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `PUT academies/:id/payment-methods/<type>` — details may be omitted to only switch an existing method on/off. */
export type SaveAcademyPaymentMethodPayload =
  | {
      readonly type: 'manual_bank_transfer';
      readonly enabled?: boolean;
      readonly instructions?: BankTransferInstructionsPayload;
    }
  | {
      readonly type: 'manual_instapay';
      readonly enabled?: boolean;
      readonly instructions?: InstapayInstructionsPayload;
    }
  | {
      readonly type: 'manual_wallet_transfer';
      readonly enabled?: boolean;
      readonly instructions?: WalletInstructionsPayload;
    };

/** The methods chosen in the academy setup form (`paymentMethods` on the provisioning request). */
export interface RequestedPaymentMethodsPayload {
  readonly bankTransfer?: BankTransferInstructionsPayload;
  readonly instapay?: InstapayInstructionsPayload;
  readonly wallet?: WalletInstructionsPayload;
}

/** Review tabs: waiting for review, approved, rejected. */
export const ACADEMY_COURSE_PAYMENT_REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;
export type AcademyCoursePaymentReviewStatus =
  (typeof ACADEMY_COURSE_PAYMENT_REVIEW_STATUSES)[number];

export interface AcademyCoursePaymentProof {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly note?: string;
  readonly payerReference?: string;
  readonly uploadedAt: string;
  /** Authenticated API route — fetched as a blob, never a public URL. */
  readonly fileUrl: string;
}

/** One learner payment to the academy, as the Client Owner reviews it. */
export interface AcademyCoursePayment {
  readonly id: string;
  readonly academyId: string;
  readonly courseOrderId: string;
  readonly course: { readonly id: string; readonly title: string };
  readonly learner: { readonly name: string; readonly maskedEmail: string };
  readonly methodType: AcademyPaymentMethodType;
  readonly money: Money;
  readonly status: PaymentLifecycleStatus;
  readonly reviewStatus: ManualReviewStatus;
  readonly reviewNotes?: string;
  readonly orderStatus: string;
  readonly proof?: AcademyCoursePaymentProof;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AcademyCoursePaymentReview {
  readonly id: string;
  readonly status: ManualReviewStatus;
  readonly notes?: string;
  readonly reviewedAt: string;
  readonly reviewerName?: string;
}

export interface AcademyCoursePaymentDetail extends AcademyCoursePayment {
  /** The details the learner was shown when they chose the method. */
  readonly instructions?: ManualPaymentInstructions;
  readonly reviews: readonly AcademyCoursePaymentReview[];
}

export interface AcademyCoursePaymentCounts {
  readonly pending: number;
  readonly approved: number;
  readonly rejected: number;
}

export interface AcademyCoursePaymentFilters {
  readonly reviewStatus?: AcademyCoursePaymentReviewStatus;
  readonly methodType?: AcademyPaymentMethodType;
  readonly from?: string;
  readonly to?: string;
}

export type AcademyCoursePaymentListQuery = Omit<
  CollectionQuery,
  'filters' | 'sort'
> & {
  readonly sort?: {
    readonly field: 'createdAt' | 'amount';
    readonly direction: 'asc' | 'desc';
  };
  readonly filters?: AcademyCoursePaymentFilters;
};

export interface ApproveAcademyCoursePaymentPayload {
  readonly notes?: string;
}

export interface RejectAcademyCoursePaymentPayload {
  /** Optional — shown to the learner and sent in their email. */
  readonly reason?: string;
}

/** One entry of the learner's own payment history (`GET course-payments`). */
export interface LearnerCoursePayment {
  readonly id: string;
  readonly courseOrderId: string;
  readonly academyId: string;
  readonly course: { readonly id: string; readonly title: string };
  readonly methodType: AcademyPaymentMethodType | 'gateway';
  /** `academy_manual` — paid to the academy; otherwise collected by Atlas. */
  readonly provider: string;
  readonly money: Money;
  readonly status: PaymentLifecycleStatus;
  readonly reviewStatus: ManualReviewStatus;
  /** The reviewer's reason — present only on a rejected payment. */
  readonly rejectionReason?: string;
  readonly orderStatus: string;
  readonly proof?: {
    readonly fileName: string;
    readonly mimeType: string;
    readonly payerReference?: string;
    readonly uploadedAt: string;
    readonly fileUrl: string;
  };
  readonly awaitingProof: boolean;
  readonly canSubmitNewPayment: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
