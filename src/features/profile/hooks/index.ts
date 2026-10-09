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
export {
  useTrustedDevices,
  useRevokeTrustedDevice,
  useRevokeOtherTrustedDevices,
  TRUSTED_DEVICES_QUERY_KEY,
} from './useTrustedDevices';
export {
  useSignInMethods,
  useUnlinkGoogle,
  SIGN_IN_METHODS_QUERY_KEY,
} from './useSignInMethods';
export {
  useUserPhone,
  useUpdatePhone,
  useRemovePhone,
  USER_PHONE_QUERY_KEY,
} from './useUserPhone';
