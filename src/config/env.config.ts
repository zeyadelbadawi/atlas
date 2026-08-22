/**
 * Environment configuration.
 *
 * Centralizes access to environment variables so features never read from
 * `import.meta.env` directly. This layer provides type-safe defaults and
 * validates required values during initialization.
 */

/** Environment names. */
export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  /** The current environment. */
  readonly environment: Environment;

  /** True when running in production. */
  readonly isProduction: boolean;

  /** True when running in development. */
  readonly isDevelopment: boolean;

  /** API base URL. */
  readonly apiBaseUrl: string;

  /** Application version. */
  readonly version: string;

  /** Enable debug logging. */
  readonly enableDebugLogging: boolean;

  /**
   * The Atlas platform's own base domain (e.g. `academy.example.com`),
   * under which Academy subdomains (`harvard.<platformBaseDomain>`) are
   * derived. Deliberately `undefined` unless a real value is supplied —
   * Atlas has no production domain today, and nothing in this codebase
   * may invent one (see `Reports/ARCHITECTURE.md`, Prompt 11, "No Real
   * Atlas Domain Yet"). This is a compiled bootstrap default only; the
   * authoritative value is `PlatformDomainConfiguration`, a backend
   * setting a Platform Owner can configure once a real domain exists
   * (`usePlatformDomainConfiguration`) — the same "compiled default,
   * superseded by backend truth" pattern Prompt 6 established for
   * `DEFAULT_TRIAL_POLICY`.
   */
  readonly platformBaseDomain?: string;
}

function getEnvironment(): Environment {
  const mode = import.meta.env.MODE;
  if (mode === 'production') return 'production';
  if (mode === 'staging') return 'staging';
  return 'development';
}

function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    (getEnvironment() === 'production'
      ? 'https://api.atlas-platform.com'
      : 'http://localhost:3000/api')
  );
}

/** Reads the optional platform base domain — `undefined` (not a fallback string) when unset, so callers can distinguish "not configured" from "configured to something." */
function getPlatformBaseDomain(): string | undefined {
  const value = import.meta.env.VITE_PLATFORM_BASE_DOMAIN;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export const ENV: EnvironmentConfig = Object.freeze({
  environment: getEnvironment(),
  isProduction: getEnvironment() === 'production',
  isDevelopment: getEnvironment() === 'development',
  apiBaseUrl: getApiBaseUrl(),
  version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  enableDebugLogging: import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true',
  platformBaseDomain: getPlatformBaseDomain(),
});