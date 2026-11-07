/**
 * Form infrastructure — public entry point.
 */
export { FormField } from './FormField';
export type { FormFieldProps } from './FormField';
export { FormActions } from './FormActions';
export { FormErrorSummary, flattenFormErrors } from './FormErrorSummary';
export type { FormErrorSummaryProps } from './FormErrorSummary';
export type { FormActionsProps } from './FormActions';
export * from './form.utils';
export * from './validation.schemas';
export { useFormSubmit } from './useFormSubmit';
export type { UseFormSubmitOptions } from './useFormSubmit';
export {
  isFieldViolationError,
  PHONE_TAKEN_ERROR_KEY,
  useServerValidation,
} from './useServerValidation';
export type { ServerValidationOptions } from './useServerValidation';
export {
  useNameConflictError,
  nameConflictFromError,
  NAME_CONFLICT_ERROR_KEYS,
} from './useNameConflictError';
export type {
  NameConflict,
  UseNameConflictErrorOptions,
} from './useNameConflictError';
export {
  fieldErrorText,
  hasViolationOn,
  useFailureReason,
  useFocusFirstViolation,
} from './form-feedback';
export { RequiredMark, SaveFailedAlert } from './SaveFailedAlert';
export type { SaveFailedAlertProps } from './SaveFailedAlert';
export {
  isDateRangeReversed,
  ReversedDateRangeAlert,
} from './ReversedDateRangeAlert';
export type { ReversedDateRangeAlertProps } from './ReversedDateRangeAlert';
