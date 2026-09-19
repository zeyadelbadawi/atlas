/**
 * Atlas providers — public entry point.
 */
export { AppProviders } from './AppProviders';
export type { AppProvidersProps } from './AppProviders';
export { ErrorBoundary } from './error/ErrorBoundary';
export type { ErrorBoundaryProps } from './error/ErrorBoundary';
export { AtlasThemeProvider } from './theme/ThemeProvider';
export { ThemeContext } from './theme/theme.context';
export type { ThemeContextValue } from './theme/theme.context';
export { AtlasLocalizationProvider } from './localization/LocalizationProvider';
export { LocalizationContext } from './localization/localization.context';
export type { LocalizationContextValue } from './localization/localization.context';
export { AtlasIdentityProvider } from './identity/IdentityProvider';
export { IdentityContext } from './identity/identity.context';
export type { IdentityContextValue } from './identity/identity.context';
export { AtlasPlatformProvider } from './platform/PlatformProvider';
export { PlatformContext } from './platform/platform.context';
export type { PlatformContextValue } from './platform/platform.context';
export { AtlasQueryProvider } from './query/QueryProvider';
export { AtlasToastProvider } from './toast/ToastProvider';
// Exported like `IdentityContext`, `ThemeContext` and the rest: a test (or
// any host that already owns notification delivery) needs to supply this
// context directly, and `AtlasToastProvider` itself depends on the theme
// and localization providers, so it cannot stand alone.
export { ToastContext } from './toast/toast.context';
export { useToast } from './toast/useToast';
export type {
  ToastContextValue,
  ToastIntent,
  ToastRequest,
} from './toast/toast.context';
export { AtlasDialogProvider } from './dialog/DialogProvider';
export { useConfirmDialog } from './dialog/useConfirmDialog';
export type {
  ConfirmIntent,
  ConfirmRequest,
  DialogContextValue,
} from './dialog/dialog.context';
export { AtlasLoadingProvider } from './loading/LoadingProvider';
export { useGlobalLoading } from './loading/useGlobalLoading';
export type { LoadingContextValue } from './loading/loading.context';
