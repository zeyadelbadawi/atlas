/**
 * Billing types.
 *
 * Types for subscription plans, billing information, invoices, and payment status.
 * These types describe the UI model only - no real payment integration.
 *
 * Scope note (Prompt 6): these types are user-scoped (`Subscription.userId`)
 * and predate the SaaS Tenant model. They are NOT the tenant-scoped
 * subscription/plan contract — see `tenant.types.ts` (`TenantSubscription`)
 * and `plan.types.ts` (`Plan`) for the Organization/Tenant-scoped
 * equivalents introduced in Prompt 6. Both sets of types are kept, on
 * purpose, since this file's `BillingPage` remains untouched Prompt 3A
 * history.
 */
import type { BaseEntity } from './common.types';

/** Subscription plan tiers. */
export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';

/** Subscription billing cycle. */
export type BillingCycle = 'monthly' | 'yearly';

/** Subscription status. */
export type SubscriptionStatus =
  | 'active'
  | 'inactive'
  | 'trial'
  | 'past_due'
  | 'canceled'
  | 'expired';

/** Payment status. */
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

/** A subscription plan. */
export interface SubscriptionPlan {
  readonly id: string;
  readonly tier: PlanTier;
  /** Translation key for the plan name. */
  readonly nameKey: string;
  /** Translation key for the plan description. */
  readonly descriptionKey: string;
  readonly price: number;
  readonly currency: string;
  readonly cycle: BillingCycle;
  readonly features: readonly string[];
  readonly limits: PlanLimits;
  readonly isPopular?: boolean;
  readonly isCurrent?: boolean;
}

/** Plan resource limits. */
export interface PlanLimits {
  readonly academies: number;
  readonly courses: number;
  readonly students: number;
  readonly storage: number; // In GB
  readonly bandwidth: number; // In GB
  readonly customDomain: boolean;
  readonly analytics: boolean;
  readonly support: 'community' | 'email' | 'priority';
}

/** Current subscription information. */
export interface Subscription extends BaseEntity {
  readonly userId: string;
  readonly planId: string;
  readonly plan: SubscriptionPlan;
  readonly status: SubscriptionStatus;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly trialEnd?: string;
  readonly metadata?: Record<string, unknown>;
}

/** An invoice. */
export interface Invoice extends BaseEntity {
  readonly invoiceNumber: string;
  readonly userId: string;
  readonly subscriptionId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly dueDate?: string;
  readonly paidAt?: string;
  readonly invoiceUrl?: string;
  readonly items: readonly InvoiceItem[];
}

/** An invoice line item. */
export interface InvoiceItem {
  readonly id: string;
  /** Translation key for the item description. */
  readonly descriptionKey: string;
  readonly quantity: number;
  readonly unitAmount: number;
  readonly amount: number;
  readonly currency: string;
}

/** Billing history entry. */
export interface BillingHistoryEntry extends BaseEntity {
  readonly userId: string;
  readonly type: 'invoice' | 'payment' | 'refund' | 'subscription_change';
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  /** Translation key for the description. */
  readonly descriptionKey: string;
  readonly metadata?: Record<string, unknown>;
}

/** Payment method information (UI representation only). */
export interface PaymentMethod {
  readonly id: string;
  readonly type: 'card' | 'bank_account';
  readonly last4: string;
  readonly brand?: string;
  readonly expiryMonth?: number;
  readonly expiryYear?: number;
  readonly isDefault: boolean;
}

/** Billing overview summary. */
export interface BillingSummary {
  readonly currentPlan: SubscriptionPlan;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly nextBillingDate?: string;
  readonly nextBillingAmount?: number;
  readonly currency: string;
  readonly outstandingBalance: number;
  readonly recentInvoices: readonly Invoice[];
}