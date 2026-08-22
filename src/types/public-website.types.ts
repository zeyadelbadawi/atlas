/**
 * Public website runtime types (Prompt 11).
 *
 * `HostnameResolution` is the ONLY thing a hostname resolves to — an
 * Academy identity, nothing else. Every subsequent public fetch
 * (configuration, pages) is then scoped by `academyId`, exactly like
 * every authenticated website hook already scopes by it (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Multi-Academy Isolation").
 */
export interface HostnameResolution {
  readonly academyId: string;
  readonly academyName: string;
  readonly academySlug: string;
  readonly academyLogo?: string;
}
