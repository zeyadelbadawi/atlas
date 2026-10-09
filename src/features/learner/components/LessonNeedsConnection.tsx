/**
 * Academy offline — the honest state for a lesson that cannot be shown
 * without a connection.
 *
 * Video is never available offline, by design: its credentials last
 * minutes, are not bound to the device, and there is no DRM — a copy kept
 * on the device would outlive the learner's access. Files and external
 * lessons are signed or third-party links for the same reason. Only text
 * lessons the server allowed are kept, and only once opened online.
 */
import { WifiOff } from 'lucide-react';
import { EmptyState } from '@components/feedback';

export function LessonNeedsConnection(): JSX.Element {
  return (
    <div data-offline-state="needs-connection">
      <EmptyState
        icon={WifiOff}
        titleKey="learning:offline.lesson.needsConnectionTitle"
        descriptionKey="learning:offline.lesson.needsConnectionDescription"
      />
    </div>
  );
}
