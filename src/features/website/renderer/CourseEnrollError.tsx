/**
 * B9 (UX audit) V07/V08 — the one message a failed "Enroll for free" shows
 * on the Course Details page, in every theme (each passes its own classes):
 *   - already enrolled: says so, with Continue to the course;
 *   - refused: the academy's real reason (the API's own sentence) only;
 *   - otherwise the cause — the connection only when that is it — and the
 *     enrol button stays there to try again.
 */
import { useTranslation } from 'react-i18next';
import { useErrorText } from '@hooks';
import { cn } from '@utils';
import type { CourseEnrollFailure } from './useCourseDetails';

const COPY = 'website:renderer.courseDetails';

/** A learner can't act on "upgrade your plan": the academy's limit, in their words. */
const LEARNER_REASON_OVERRIDES: Readonly<Record<string, string>> = {
  'errors.entitlement.limitReached': `${COPY}.enrollLimitReached`,
  'errors.entitlement.noSubscription': `${COPY}.enrollUnavailable`,
  'errors.entitlement.subscriptionInactive': `${COPY}.enrollUnavailable`,
};

export function CourseEnrollError({
  error,
  onContinue,
  className,
  actionClassName,
}: {
  readonly error: CourseEnrollFailure | null;
  readonly onContinue: () => void;
  readonly className?: string;
  readonly actionClassName?: string;
}): JSX.Element | null {
  const { t } = useTranslation();
  const errorText = useErrorText();
  if (!error) return null;

  let text: string;
  switch (error.kind) {
    case 'alreadyEnrolled':
      text = t(`${COPY}.alreadyEnrolled`);
      break;
    case 'refused': {
      const override = LEARNER_REASON_OVERRIDES[error.messageKey];
      text = override
        ? t(override)
        : errorText(error.messageKey, `${COPY}.enrollRefused`);
      break;
    }
    case 'network':
      text = t(`${COPY}.enrollNetworkError`);
      break;
    case 'server':
      text = t(`${COPY}.enrollError`);
      break;
  }

  return (
    <div
      role="alert"
      data-enroll-error={error.kind}
      className={cn('space-y-2', className)}
    >
      <p>{text}</p>
      {error.kind === 'alreadyEnrolled' ? (
        <button type="button" className={actionClassName} onClick={onContinue}>
          {t(`${COPY}.continueToCourse`)}
        </button>
      ) : null}
    </div>
  );
}
