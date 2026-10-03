/**
 * Wizard step 4 — Curriculum (W6): the SAME `CourseCurriculumEditor` the
 * Course Builder page uses (units, lessons, unified item order, reorder,
 * live sessions). Every change saves as it is made, so Next simply moves
 * on.
 */
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { CourseCurriculumEditor } from '../components/CourseCurriculumEditor';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

export function CurriculumStep({
  academyId,
  course,
  onBack,
  onNext,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
        {t('course:wizard.curriculumHint')}
      </p>
      <CourseCurriculumEditor academyId={academyId} courseId={course.id} />
      <WizardStepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={t('course:wizard.continue')}
      />
    </div>
  );
}
