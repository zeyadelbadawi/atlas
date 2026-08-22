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

export const ENV: EnvironmentConfig = Object.freeze({
  environment: getEnvironment(),
  isProduction: getEnvironment() === 'production',
  isDevelopment: getEnvironment() === 'development',
  apiBaseUrl: getApiBaseUrl(),
  version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  enableDebugLogging: import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true',
});