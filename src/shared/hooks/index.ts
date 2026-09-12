/**
 * Shared hooks — public entry point.
 */
export { useTheme } from './useTheme';
export { useLanguage } from './useLanguage';
export { useBreakpoint } from './useBreakpoint';
export type { BreakpointState } from './useBreakpoint';
export { useMediaQuery } from './useMediaQuery';
export { useDisclosure } from './useDisclosure';
export type { DisclosureState } from './useDisclosure';
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export type { StoredValueState } from './useLocalStorage';
export { usePagination, PAGE_GAP } from './usePagination';
export type { PaginationState, PaginationEntry } from './usePagination';
export { useCopyToClipboard } from './useCopyToClipboard';
export type { CopyToClipboardState } from './useCopyToClipboard';
export { useOnlineStatus } from './useOnlineStatus';
export { useAuth } from './useAuth';
export { useCurrentUser } from './useCurrentUser';
export { useSession } from './useSession';
export { usePermissions } from './usePermissions';
export type { UsePermissionsResult } from './usePermissions';
export { useRoles } from './useRoles';
export type { UseRolesResult } from './useRoles';
export { useSignIn } from './useSignIn';
export type { UseSignInResult } from './useSignIn';
export { useSignOut } from './useSignOut';
export type { UseSignOutResult } from './useSignOut';
export { usePlatform } from './usePlatform';
export { useFeatureFlag } from './useFeatureFlag';
export { useApiQuery } from './useApiQuery';
export { useApiMutation } from './useApiMutation';
export type { UseApiMutationOptions } from './useApiMutation';
export { useInvalidate } from './useInvalidate';
export type { UseInvalidateResult } from './useInvalidate';
export { useUnsavedChanges } from './useUnsavedChanges';
export type { UseUnsavedChangesOptions } from './useUnsavedChanges';
export { useFileUpload } from './useFileUpload';
export type { FileUploadOptions, UseFileUploadResult } from './useFileUpload';
export { useFilePicker } from './useFilePicker';
export type { FilePickerOptions, UseFilePickerResult } from './useFilePicker';
export { useSearch } from './useSearch';
export type { UseSearchOptions, UseSearchResult } from './useSearch';
export { useToast, toast } from '@/hooks/use-toast';

/**
 * Academy identity/branding and public statistics — shared, not
 * feature-owned: the dashboard sidebar, the Student LMS shell and the
 * website section renderers all read them. See `@services`' note on
 * `PublicWebsiteService` for why they could not stay inside
 * `@features/public-website`.
 */
export { useAcademyIdentity } from './useAcademyIdentity';
export { usePublicWebsiteStatistics } from './usePublicWebsiteStatistics';
export { usePublicCourses } from './usePublicCourses';
export type { UsePublicCoursesOptions } from './usePublicCourses';
export { usePublicCourse, usePublicCourseCurriculum } from './usePublicCourse';

/**
 * Dates in the user's chosen language, not the browser's. See the hook's
 * own comment for the defect this exists to prevent.
 */
export { useDateFormatter } from './useDateFormatter';
export type { DateFormatters } from './useDateFormatter';
