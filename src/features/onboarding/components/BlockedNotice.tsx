/**
 * Shown in place of a step that cannot start yet — the server reported it
 * `blocked` — with the one action that unblocks it.
 */
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingScreenKey } from '@types';
import { StepPanel } from './StepPanel';

export interface BlockedNoticeProps {
  /** What has to happen first. */
  readonly waitingOn: 'plan' | 'academy';
  readonly goTo: (screen: OnboardingScreenKey) => void;
}

export function BlockedNotice({
  waitingOn,
  goTo,
}: BlockedNoticeProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <StepPanel
      icon={Lock}
      title={t(`onboarding:blocked.${waitingOn}`)}
      testId="onboarding-blocked"
      actions={
        <Button type="button" onClick={() => goTo(waitingOn)}>
          {t(
            waitingOn === 'plan'
              ? 'onboarding:blocked.goToPlan'
              : 'onboarding:blocked.goToAcademy'
          )}
        </Button>
      }
    />
  );
}
