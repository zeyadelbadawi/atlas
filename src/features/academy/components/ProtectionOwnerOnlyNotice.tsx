/**
 * The read-only state shared by the three content-protection cards.
 *
 * Unlike the registration policy, a Manager cannot even READ these
 * settings — the backend runs the owner-only check on every GET — so a
 * non-owner is shown why the card is empty instead of an error with a
 * Retry that can only fail again.
 */
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ProtectionOwnerOnlyNotice(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Alert role="status">
      <Lock className="size-4" aria-hidden />
      <AlertDescription>{t('academy:protection.ownerOnly')}</AlertDescription>
    </Alert>
  );
}
