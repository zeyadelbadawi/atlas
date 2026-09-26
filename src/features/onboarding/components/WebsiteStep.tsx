/**
 * Setup — Website (required).
 *
 * Says plainly whether the academy's website is published — learners
 * cannot see it until it is — links to it on its public host when one
 * exists, and publishes it through the SAME mutation the Website
 * Builder's publish bar uses (`usePublishWebsite` →
 * `POST /academies/:id/website/publish`). Only the server's re-read
 * status marks the step complete.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EyeOff, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { toErrorsNamespaceKey } from '@utils';
import { buildAcademyUrl } from '@features/auth';
import { usePublishWebsite } from '@features/website';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { StepPanel } from './StepPanel';
import { findStep } from '../utils/onboarding-status.utils';
import { BlockedNotice } from './BlockedNotice';
import type { OnboardingStepProps } from './step.types';

export function WebsiteStep({
  status,
  eyebrow,
  onBack,
  onNext,
  goTo,
  refresh,
}: OnboardingStepProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const step = findStep(status, 'website');
  const publish = usePublishWebsite();
  const academy = status.academy;
  const isPublished = step?.status === 'complete';
  const isBlocked = step?.status === 'blocked' || !academy;
  const siteUrl = academy?.host ? buildAcademyUrl(academy.host, '/') : null;

  const publishErrorKey = publish.error
    ? toErrorsNamespaceKey(publish.error.messageKey)
    : undefined;

  const renderBody = (): JSX.Element => {
    if (isBlocked || !academy) {
      return <BlockedNotice waitingOn="academy" goTo={goTo} />;
    }

    const siteLink = siteUrl ? (
      <Button asChild variant="outline" size="sm">
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="website-host-link"
        >
          {t(isPublished ? 'onboarding:website.visit' : 'onboarding:website.preview')}
        </a>
      </Button>
    ) : null;
    const customizeLink = (
      <Button asChild variant="ghost" size="sm">
        <Link
          to={buildPath(DASHBOARD_ROUTES.websiteOverview, {
            academyId: academy.id,
          })}
        >
          {t('onboarding:website.customize')}
        </Link>
      </Button>
    );
    const hostLine = academy.host ? (
      <p className="text-sm font-medium text-foreground" dir="ltr">
        {academy.host}
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">
        {t('onboarding:website.noHost')}
      </p>
    );

    if (isPublished) {
      return (
        <StepPanel
          icon={Globe}
          tone="success"
          title={t('onboarding:website.publishedTitle')}
          description={t('onboarding:website.publishedDescription')}
          testId="website-published"
          actions={
            <>
              {siteLink}
              {customizeLink}
            </>
          }
        >
          {hostLine}
        </StepPanel>
      );
    }

    return (
      <div className="space-y-6">
        <StepPanel
          icon={EyeOff}
          tone="warning"
          title={t('onboarding:website.unpublishedTitle')}
          description={t('onboarding:website.unpublishedDescription')}
          testId="website-unpublished"
          actions={
            <>
              {siteLink}
              {customizeLink}
            </>
          }
        >
          {hostLine}
        </StepPanel>

        {publish.error ? (
          <p role="alert" className="text-sm text-destructive">
            {publishErrorKey && i18n.exists(publishErrorKey)
              ? t(publishErrorKey)
              : t('onboarding:website.publishFailed')}
          </p>
        ) : null}

        <Button
          type="button"
          size="lg"
          disabled={publish.isPending}
          aria-busy={publish.isPending}
          onClick={() =>
            publish.mutate(academy.id, {
              onSuccess: () => void refresh(),
            })
          }
        >
          {publish.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('onboarding:website.publishing')}
            </>
          ) : (
            t('onboarding:website.publish')
          )}
        </Button>
      </div>
    );
  };

  return (
    <OnboardingStepFrame
      stepKey="website"
      eyebrow={eyebrow}
      title={t('onboarding:steps.website.title')}
      description={t('onboarding:steps.website.description')}
      onBack={onBack}
      onContinue={isPublished ? onNext : undefined}
      continueIsPrimary={isPublished}
    >
      {renderBody()}
    </OnboardingStepFrame>
  );
}
