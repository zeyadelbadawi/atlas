/**
 * Management sign-in refusal for a learner (P64 Phase 1, AD-5, F1).
 *
 * Shown IN PLACE of the sign-in form — never as a toast — when
 * `POST /auth/sign-in` on the management surface answers 403
 * `errors.auth.studentUseAcademySignIn`. No session exists at this point:
 * the backend refused to mint one, so there is nothing to sign out of and
 * nothing to redirect. What the learner needs is the way in, which is the
 * academy website's own sign-in, and that is what this renders — one link
 * per academy the response named, with a way back to the form for someone
 * who typed the wrong account.
 */
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RefusedSignInAcademy } from '@types';
import { AcademyLinkList } from './AcademyLinkList';

export interface StudentSignInRefusalProps {
  readonly academies: readonly RefusedSignInAcademy[];
  readonly onBack: () => void;
}

export function StudentSignInRefusal({
  academies,
  onBack,
}: StudentSignInRefusalProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <section
      role="status"
      aria-labelledby="student-refusal-title"
      className="space-y-6 rounded-lg border border-border bg-card p-6"
      data-testid="student-sign-in-refusal"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primary">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2
            id="student-refusal-title"
            className="font-display text-lg font-semibold text-foreground"
          >
            {t('auth:studentRefusal.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('auth:studentRefusal.description')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {t('auth:studentRefusal.yourAcademies')}
        </p>
        <AcademyLinkList
          academies={academies}
          targetPath="/sign-in"
          emphasizeSingle
        />
        {academies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('auth:studentRefusal.noAcademiesHint')}
          </p>
        ) : null}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={onBack}>
        {t('auth:studentRefusal.backToSignIn')}
      </Button>
    </section>
  );
}
