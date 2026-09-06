/**
 * Public website runtime types (Prompt 11).
 *
 * `HostnameResolution` is the ONLY thing a hostname resolves to — an
 * Academy identity, nothing else. Every subsequent public fetch
 * (configuration, pages) is then scoped by `academyId`, exactly like
 * every authenticated website hook already scopes by it (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Multi-Academy Isolation").
 */
import type { AcademyAddress } from './academy.types';

export interface HostnameResolution {
  readonly academyId: string;
  readonly academyName: string;
  readonly academySlug: string;
  readonly academyLogo?: string;
}

/** Phase 6 — `StatisticsSection`'s real, live, Academy-scoped counts (`GET public/websites/:academyId/statistics`). Never revenue or any other private figure. */
export interface PublicWebsiteStatistics {
  readonly courses: number;
  readonly students: number;
  readonly instructors: number;
}

/** Phase 6 — the public Contact section's submission payload (`POST public/websites/:academyId/contact`). */
export interface ContactMessagePayload {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

/**
 * Phase 6 — the ONE combined Academy Identity/Branding read
 * (`GET public/websites/:academyId/identity`), reused across the Public
 * Website, the Student LMS, and the Dashboard. Colors are HSL triplet
 * strings matching `WebsiteBrandConfig`'s own `HslColorTriplet` shape —
 * present only when the Academy has a real published website configuration.
 */
export interface AcademyIdentity {
  readonly academyId: string;
  readonly name: string;
  readonly logoUrl?: string;
  readonly faviconUrl?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly accentColor?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly address?: AcademyAddress;
}
