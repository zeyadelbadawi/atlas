/**
 * B9 (UX audit) — the Contact form's feedback, drawn by every theme with its
 * own classes: a field's problem and counter, the one alert for a failure
 * no field can show (with Try again where it helps), and the required note.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { canRetryContact, type ContactFailure } from './contact-form.logic';
import type {
  ContactFieldState,
  ContactFormController,
} from './useContactForm';

const FAILURE = 'website:renderer.contactForm.failure';

/** Under a field: its problem (start) and its counter (end). */
export function ContactFieldFeedback({
  field,
  className,
  errorClassName,
  countClassName,
  overClassName,
}: {
  readonly field: ContactFieldState;
  readonly className?: string;
  readonly errorClassName?: string;
  readonly countClassName?: string;
  /** The counter while the value is over the limit (defaults to the error colour). */
  readonly overClassName?: string;
}): JSX.Element {
  // The row is always there (one line tall), so a problem appearing when
  // the visitor leaves a field doesn't push Send away mid-click.
  return (
    <div
      className={cn(
        'mt-1.5 flex min-h-5 items-start justify-between gap-3',
        className
      )}
    >
      {field.error ? (
        <p
          id={field.errorId}
          className={cn('min-w-0 text-sm', errorClassName)}
          data-contact-field-error=""
        >
          {field.error}
        </p>
      ) : null}
      {field.count ? (
        <p
          id={field.countId}
          className={cn(
            'ms-auto shrink-0 text-xs tabular-nums',
            countClassName,
            field.over && (overClassName ?? errorClassName)
          )}
          data-contact-count=""
        >
          {field.count}
        </p>
      ) : null}
    </div>
  );
}

function failureText(
  t: (key: string, values?: Record<string, unknown>) => string,
  failure: ContactFailure
): string {
  switch (failure.kind) {
    case 'rateLimited':
      return failure.minutes !== undefined
        ? t(`${FAILURE}.rateLimited`, { count: failure.minutes })
        : t(`${FAILURE}.rateLimitedSoon`);
    case 'network':
      return t(`${FAILURE}.network`);
    case 'unavailable':
      return t(`${FAILURE}.unavailable`);
    case 'rejected':
      return t(`${FAILURE}.rejected`);
    case 'server':
      return t(`${FAILURE}.server`);
  }
}

/** The one message for a failure no field can show; takes focus when it appears. */
export function ContactFailureAlert({
  contact,
  className,
  retryClassName,
}: {
  readonly contact: Pick<
    ContactFormController,
    'failure' | 'alertRef' | 'retry' | 'isSending'
  >;
  readonly className?: string;
  readonly retryClassName?: string;
}): JSX.Element | null {
  const { t } = useTranslation();
  const { failure } = contact;
  if (!failure) return null;
  return (
    <div
      ref={contact.alertRef}
      role="alert"
      tabIndex={-1}
      data-contact-failure={failure.kind}
      className={cn('space-y-2 text-sm outline-none', className)}
    >
      <p className="font-semibold">{t(`${FAILURE}.title`)}</p>
      <p>{failureText(t, failure)}</p>
      {failure.kind === 'server' && failure.requestId ? (
        <p className="text-xs opacity-80">
          {t(`${FAILURE}.reference`, {
            reference: failure.requestId.slice(0, 8),
          })}
        </p>
      ) : null}
      {canRetryContact(failure) ? (
        <button
          type="button"
          className={retryClassName}
          onClick={contact.retry}
          disabled={contact.isSending}
        >
          {t('common:actions.retry')}
        </button>
      ) : null}
    </div>
  );
}

/** "All fields are required." — for a theme whose form doesn't already say so. */
export function ContactRequiredNote({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <p className={className} data-contact-required-note="">
      {t('website:renderer.contactForm.requiredNote')}
    </p>
  );
}

/** The submit button's text: "Sending…" while it sends. */
export function useContactSubmitLabel(isSending: boolean): string {
  const { t } = useTranslation();
  return isSending
    ? t('website:renderer.contactForm.sending')
    : t('website:renderer.contactSubmit');
}
