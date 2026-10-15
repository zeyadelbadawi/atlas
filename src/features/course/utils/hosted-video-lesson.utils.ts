/**
 * B0-MED-11 — what a lesson save sends about its Atlas-hosted video.
 *
 * One place for the rule, so the feature switch is honoured in exactly one
 * spot: while `hostedVideoAuthoring` is off nothing about the hosted video
 * is sent, whatever the form holds (lessons keep working on YouTube links,
 * and an existing attachment is left untouched). When on:
 *   - a Video lesson with a hosted video attaches it (`videoAssetId`);
 *   - editing, a video removed in the dialog (`null`) — or a lesson that
 *     stopped being a Video lesson while one was attached — detaches it
 *     (`videoAssetId: null`).
 */
import type { CourseLessonFormData } from '../schemas/course.schemas';

export function hostedVideoLessonPatch(args: {
  readonly enabled: boolean;
  readonly mode: 'create' | 'edit';
  readonly data: Pick<CourseLessonFormData, 'contentType' | 'hostedVideo'>;
  /** The saved lesson's current hosted video (edit only). */
  readonly currentVideoAssetId?: string | null;
}): { readonly videoAssetId?: string | null } {
  const { enabled, mode, data, currentVideoAssetId } = args;
  if (!enabled) return {};
  if (data.contentType === 'video' && data.hostedVideo) {
    return { videoAssetId: data.hostedVideo.mediaAssetId };
  }
  const detach =
    mode === 'edit' &&
    (data.hostedVideo === null ||
      (data.contentType !== 'video' && !!currentVideoAssetId));
  return detach ? { videoAssetId: null } : {};
}
