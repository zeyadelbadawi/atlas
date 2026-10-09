/**
 * Academy offline — a lesson read from the copy kept on this device.
 *
 * Says so plainly, with the date the copy disappears: a learner reading
 * without a connection should know they are reading a saved copy (which
 * may predate an edit by the academy), and that it will not be kept
 * forever. The body goes through the same sanitiser as a live lesson.
 */
import { useTranslation } from 'react-i18next';
import { HardDriveDownload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDateFormatter } from '@hooks';
import type { OfflineLessonText } from '@services/offline';
import { TextLessonView } from './TextLessonView';

export interface OfflineLessonViewProps {
  readonly lesson: OfflineLessonText;
  readonly onFinished?: () => void;
}

export function OfflineLessonView({
  lesson,
  onFinished,
}: OfflineLessonViewProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  return (
    <div className="space-y-4" data-offline-lesson={lesson.lessonId}>
      <Alert role="status">
        <HardDriveDownload className="size-4" aria-hidden />
        <AlertTitle>{t('learning:offline.lesson.savedCopyTitle')}</AlertTitle>
        <AlertDescription>
          {t('learning:offline.lesson.savedCopyDescription', {
            date: fmt.dateTime(new Date(lesson.until).toISOString()),
          })}
        </AlertDescription>
      </Alert>
      <TextLessonView
        bodyHtml={lesson.bodyHtml}
        title={lesson.title}
        onReadingProgress={(percentage) => {
          if (percentage >= 100) onFinished?.();
        }}
      />
    </div>
  );
}
