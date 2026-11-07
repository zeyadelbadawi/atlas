/**
 * Types for the Add-ons Catalog Management surface (Platform Owner only).
 *
 * `catalogStatus` is the CUSTOMER-STORE publication state a Platform Owner
 * controls here — deliberately distinct from any tenant's install/enable
 * state, which the two counts only report on, never drive.
 */
export type AddOnCatalogStatus = 'draft' | 'coming_soon' | 'published';

export interface PlatformAddOnRow {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  /** B5 (UX audit) V21 — shown in the Arabic store and checkout; `null` = the English text is shown. */
  readonly nameAr: string | null;
  readonly descriptionAr: string | null;
  readonly catalogStatus: AddOnCatalogStatus;
  readonly installCount: number;
  readonly enabledCount: number;
  readonly version: number;
  readonly updatedAt: string;
  /**
   * The add-on's catalog price (major units). `null` (or absent, from a
   * response predating it) = no price recorded. The billing cycle is the
   * stored one; a price edit never changes it.
   */
  readonly pricing?: AddOnPricing | null;
}

export interface AddOnPricing {
  readonly amount?: number;
  readonly currency?: string;
  readonly billingCycle?: 'monthly' | 'yearly';
  readonly yearlyAmount?: number;
}

export interface PlatformAddOnQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: AddOnCatalogStatus;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
}

export interface UpdateAddOnCatalogStatusInput {
  readonly catalogStatus: AddOnCatalogStatus;
  readonly expectedVersion: number;
}

/** `PATCH platform-add-ons/:key/arabic-text` — a blank text clears it. */
export interface UpdateAddOnArabicTextInput {
  readonly nameAr: string;
  readonly descriptionAr: string;
  readonly expectedVersion: number;
}

/**
 * `PATCH platform-add-ons/:key/pricing` — a whole amount from 1 to
 * 1,000,000; the currency must be EGP. Applies to new purchases only.
 */
export interface UpdateAddOnPricingInput {
  readonly amount: number;
  readonly currency: 'EGP';
  readonly expectedVersion: number;
}
