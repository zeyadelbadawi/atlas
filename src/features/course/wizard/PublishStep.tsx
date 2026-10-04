/**
 * Wizard step 8 — Publish (W6).
 *
 * The Publish button is enabled only when the server's readiness verdict
 * has no failing BLOCKING check. This is the wizard's own gate: in Phase 1
 * the server does not refuse an unready publish (see `course-readiness.ts`,
 * backend), so the classic Settings page keeps its existing behaviour.
 * After publishing, the step shows the published state with onward links.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { usePublishCourse } from '../hooks';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

export function PublishStep({
  academyId,
  course,
  readiness,
  readinessLoading,
  onBack,
  goToStep,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const publish = usePublishCourse(academyId);
  const ready = readiness?.ready === true;

  const handlePublish = async () => {
    if (!ready) return;
    const confirmed = await confirm({
      titleKey: 'course:wizard.publish.confirmTitle',
      descriptionKey: 'course:wizard.publish.confirmDescription',
      confirmLabelKey: 'course:wizard.publish.confirmLabel',
      cancelLabelKey: 'course:wizard.publish.cancelLabel',
      intent: 'default',
    });
    if (!confirmed) return;
    try {
      await publish.mutateAsync(course.id);
      toast({ title: t('course:wizard.publish.success') });
    } catch {
      toast({
        title: t('course:wizard.publish.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  if (course.status === 'published') {
    return (
      <div className="space-y-6">
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-lg border border-success/50 bg-success-surface p-8 text-center"
          data-testid="wizard-published"
        >
          <CheckCircle2
            className="size-10 text-success"
            strokeWidth={1.75}
            aria-hidden
          />
          <p className="font-display text-lg font-semibold text-foreground">
            {t('course:wizard.publish.publishedTitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('course:wizard.publish.publishedDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild>
              <Link
                to={buildPath(DASHBOARD_ROUTES.academyCourses, { academyId })}
              >
                {t('course:wizard.publish.viewCourses')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                to={buildPath(DASHBOARD_ROUTES.academyCourseSettings, {
                  academyId,
                  courseId: course.id,
                })}
              >
                {t('course:wizard.publish.openSettings')}
              </Link>
            </Button>
          </div>
        </div>
        <WizardStepFooter onBack={onBack} hideNext />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground" id="wizard-publish-help">
          {ready
            ? t('course:wizard.publish.readyDescription')
            : t('course:wizard.publish.blockedDescription')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handlePublish()}
            disabled={!ready || publish.isPending || readinessLoading}
            aria-describedby="wizard-publish-help"
          >
            {publish.isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <Rocket className="size-4" strokeWidth={2} aria-hidden />
            )}
            {publish.isPending
              ? t('course:wizard.publish.publishing')
              : t('course:wizard.publish.button')}
          </Button>
          {ready ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep('review')}
            >
              {t('course:wizard.publish.goToReview')}
            </Button>
          )}
        </div>
      </div>
      <WizardStepFooter onBack={onBack} hideNext />
    </div>
  );
}
