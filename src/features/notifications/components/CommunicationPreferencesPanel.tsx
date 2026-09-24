/**
 * The data-wired communication preferences matrix — a person's own.
 *
 * Owns the query, the optimistic mutation and the three states around
 * them (skeleton, error-with-retry, matrix), so the two profile pages
 * that show it (`/dashboard/profile`, `/my/profile`) render one line and
 * cannot drift from each other. The platform defaults page does NOT use
 * this: its data is the legacy channel triple, so it wires the matrix
 * itself in `defaults` mode.
 */
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@components/feedback';
import {
  useCommunicationPreferences,
  useUpdateCommunicationPreferences,
} from '../hooks';
import {
  CommunicationPreferencesMatrix,
  CommunicationPreferencesMatrixSkeleton,
} from './CommunicationPreferencesMatrix';

export interface CommunicationPreferencesPanelProps {
  readonly className?: string;
}

export function CommunicationPreferencesPanel({
  className,
}: CommunicationPreferencesPanelProps): JSX.Element {
  const { t } = useTranslation();
  const preferences = useCommunicationPreferences();
  const update = useUpdateCommunicationPreferences();

  if (preferences.isLoading) {
    return <CommunicationPreferencesMatrixSkeleton className={className} />;
  }

  if (preferences.error || !preferences.data) {
    return (
      <ErrorState
        titleKey="notifications:communication.loadFailed"
        onRetry={() => preferences.refetch()}
      />
    );
  }

  return (
    <div className={className}>
      <CommunicationPreferencesMatrix
        value={preferences.data}
        onChange={(patch) => update.mutate(patch)}
        isPending={update.isPending}
      />
      {/* Saving is announced, not shown: the control already moved
          (optimistically), and a spinner beside it would suggest it had
          not. The toast carries success/failure. */}
      <p role="status" aria-live="polite" className="sr-only">
        {update.isPending ? t('common:states.saving') : ''}
      </p>
    </div>
  );
}
