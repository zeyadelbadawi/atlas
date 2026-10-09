/**
 * Academy offline — the saved TEXT of a lesson, for when the grant cannot
 * be fetched (no connection). Only what the server permitted for offline
 * reading is ever there (`learner-content.ts`), only for this learner on
 * this academy, and only until its expiry. Looked up only while there is
 * no live grant: online, the live grant is always what is shown.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@hooks';
import {
  loadOfflineLessonText,
  type OfflineLessonText,
} from '@services/offline';

export function useOfflineLessonText(
  courseId: string,
  lessonId: string,
  enabled: boolean
): { readonly record: OfflineLessonText | null; readonly checked: boolean } {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{
    key: string;
    record: OfflineLessonText | null;
  } | null>(null);
  const key = `${userId ?? ''}|${courseId}|${lessonId}`;

  useEffect(() => {
    if (!enabled || !userId || !courseId || !lessonId) return;
    let cancelled = false;
    void loadOfflineLessonText(userId, courseId, lessonId).then((record) => {
      if (!cancelled) setState({ key, record });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, courseId, lessonId, key]);

  if (!enabled || state?.key !== key) return { record: null, checked: false };
  return { record: state.record, checked: true };
}
