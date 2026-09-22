/**
 * The acknowledged warning (warn / strict modes), shown from the second
 * violation on — the first is an inline banner (`alerts.md › Use alerts
 * sparingly`). Says how many were recorded, how many remain, and what
 * happens at the limit, and its only button continues the quiz.
 */
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatNumber } from '@utils';
import type { LanguageCode, QuizIntegrityMode } from '@types';

export interface IntegrityWarningDialogProps {
  readonly open: boolean;
  readonly violations: number;
  readonly max: number;
  readonly mode: QuizIntegrityMode;
  readonly onAcknowledge: () => void;
}

export function IntegrityWarningDialog({
  open,
  violations,
  max,
  mode,
  onAcknowledge,
}: IntegrityWarningDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const remaining = Math.max(0, max - violations);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('learning:quiz.integrity.dialogTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {t('learning:quiz.integrity.dialogRecorded', {
                count: violations,
                max: formatNumber(max, language),
              })}
            </span>
            <span className="block">
              {mode === 'strict'
                ? t('learning:quiz.integrity.dialogStrictConsequence', {
                    count: remaining,
                  })
                : t('learning:quiz.integrity.dialogWarnConsequence')}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onAcknowledge}>
            {t('learning:quiz.integrity.continue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
