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
  readonly catalogStatus: AddOnCatalogStatus;
  readonly installCount: number;
  readonly enabledCount: number;
  readonly version: number;
  readonly updatedAt: string;
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
