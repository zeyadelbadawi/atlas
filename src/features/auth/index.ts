/**
 * Authentication feature - public exports.
 */

// Pages
export { default as SignInPage } from './pages/SignInPage';
export { default as RegistrationPage } from './pages/RegistrationPage';
export { default as ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { default as ResetPasswordPage } from './pages/ResetPasswordPage';
export { default as AcademyChooserPage } from './pages/AcademyChooserPage';
export { default as LearnerSurfaceRedirectPage } from './pages/LearnerSurfaceRedirectPage';

// Components
export { SignInForm } from './components/SignInForm';
export type { SignInFormProps } from './components/SignInForm';
export { RegistrationForm } from './components/RegistrationForm';
export type { RegistrationFormProps } from './components/RegistrationForm';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export type { ResetPasswordFormProps } from './components/ResetPasswordForm';
export { TwoFactorChallengeForm } from './components/TwoFactorChallengeForm';
export type { TwoFactorChallengeFormProps } from './components/TwoFactorChallengeForm';
export { AcademyLinkList } from './components/AcademyLinkList';
export type { AcademyLinkListProps } from './components/AcademyLinkList';
export { StudentSignInRefusal } from './components/StudentSignInRefusal';
export { AcademyChooser } from './components/AcademyChooser';

// Hooks and helpers the academy website's own auth pages reuse.
export {
  useValidatePasswordResetToken,
  useVerifyEmail,
} from './hooks';
export {
  AUTH_ERROR_KEYS,
  isSafeReturnPath,
  isLearnerPrincipal,
  isManagementPrincipal,
  buildAcademyUrl,
  readRefusedAcademies,
} from './utils/academy-surface.utils';
