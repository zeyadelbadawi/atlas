/**
 * Profile hooks — public entry point.
 */
export { useUpdateProfile } from './useUpdateProfile';
export type { UpdateProfileVariables } from './useUpdateProfile';
export { useUpdatePreferences } from './useUpdatePreferences';
export { useChangePassword } from './useChangePassword';
export type { ChangePasswordVariables } from './useChangePassword';
export {
  useSessions,
  useRevokeSession,
  SESSIONS_QUERY_KEY,
} from './useSessions';
export type { RevokeSessionVariables } from './useSessions';
