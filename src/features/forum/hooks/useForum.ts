/**
 * useForum hook.
 *
 * Fetches a course's forum. No `userId` scoping needed — a forum's
 * visibility is scoped by `courseId` alone (enrollment/teaching
 * authorization is enforced server-side).
 */
import { useApiQuery } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import { forumService } from '../services/ForumService';
import type { Forum } from '@types';

export interface UseForumOptions {
  readonly enabled?: boolean;
}

export function useForum(courseId: string, options?: UseForumOptions) {
  const { enabled = true } = options ?? {};

  return useApiQuery<Forum>({
    queryKey: forumKeys.forum(courseId),
    queryFn: () => forumService.getForum(courseId),
    enabled: enabled && !!courseId,
  });
}
