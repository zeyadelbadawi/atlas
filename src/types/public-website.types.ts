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
  /** P63 — the one host this website advertises (connected custom domain, otherwise the Atlas subdomain). The public runtime sets `rel="canonical"` to it and moves a visitor on the other host there. */
  readonly canonicalHost?: string;
  /**
   * Theme 1 plan Phase 6 — the website's theme and public colours,
   * whatever its publication state, so Coming Soon can wear them. Absent
   * when the Academy has no website configuration (or from an older
   * backend); the shared Coming Soon is shown then.
   */
  readonly presentation?: HostnamePresentation;
}

export interface HostnamePresentation {
  readonly themeKey: string;
  readonly brand: {
    readonly primaryColor?: string;
    readonly secondaryColor?: string;
    readonly accentColor?: string;
    readonly palette?: Record<string, unknown>;
  };
}

/** Phase 6 — `StatisticsSection`'s real, live, Academy-scoped counts (`GET public/websites/:academyId/statistics`). Never revenue or any other private figure. */
export interface PublicWebsiteStatistics {
  readonly courses: number;
  readonly students: number;
  readonly instructors: number;
}

/** Theme 1 plan §D.2 — `CourseCategoriesSection`'s live data (`GET public/websites/:academyId/categories`): only categories with at least one published public course. */
export interface PublicCourseCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly courseCount: number;
}

/** Phase 6 — the public Contact section's submission payload (`POST public/websites/:academyId/contact`). */
export interface ContactMessagePayload {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  /** The form's hidden spam trap: people leave it empty; when filled, the backend accepts and discards the message. */
  readonly company?: string;
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
