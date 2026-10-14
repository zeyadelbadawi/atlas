/**
 * B0-MED-11 — uploading a lesson video to Atlas's own storage (Normal tier).
 *
 * Three steps, all on existing endpoints:
 *   1. `POST academies/:id/media/video-uploads` reserves quota for the
 *      declared length and returns a one-shot presigned PUT URL;
 *   2. the browser PUTs the file straight to storage (no video byte goes
 *      through the API), sending exactly the signed `Content-Type`;
 *   3. `POST .../video-uploads/:assetId/complete` — the server HEADs the
 *      object, measures the real duration and marks the asset ready.
 */
import type { CourseService } from '../services/CourseService';

/** The only container the Normal tier serves (progressive MP4). */
export const HOSTED_VIDEO_ACCEPT = 'video/mp4';
export const HOSTED_VIDEO_CONTENT_TYPE = 'video/mp4';
/** Mirrors the API's `MAX_VIDEO_UPLOAD_BYTES` (5 GiB). */
export const MAX_HOSTED_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
/** Used when the browser cannot read the length; the server re-measures it. */
export const FALLBACK_DECLARED_SECONDS = 60 * 60;

/** The file's length in whole seconds, or `null` when the browser cannot tell. */
export function readVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (
      typeof document === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      done(
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.ceil(video.duration)
          : null
      );
    video.onerror = () => done(null);
    video.src = url;
  });
}

/** PUTs a file to a presigned URL, reporting progress (0–100). */
export function putFileWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('upload failed'));
    xhr.send(file);
  });
}

export interface UploadedHostedVideo {
  readonly id: string;
  readonly fileName: string;
}

export async function uploadHostedVideo(
  service: Pick<
    CourseService,
    'createHostedVideoUpload' | 'completeHostedVideoUpload'
  >,
  input: {
    readonly academyId: string;
    readonly courseId: string;
    readonly file: File;
    readonly onProgress?: (percent: number) => void;
  },
  deps: {
    readonly readDuration?: (file: File) => Promise<number | null>;
    readonly put?: typeof putFileWithProgress;
  } = {}
): Promise<UploadedHostedVideo> {
  const readDuration = deps.readDuration ?? readVideoDurationSeconds;
  const put = deps.put ?? putFileWithProgress;
  const measured = await readDuration(input.file);
  // A small margin: the reservation is a ceiling, corrected at completion.
  const maxDurationSeconds = measured
    ? measured + 30
    : FALLBACK_DECLARED_SECONDS;
  const ticket = await service.createHostedVideoUpload(input.academyId, {
    fileName: input.file.name,
    maxDurationSeconds,
    courseId: input.courseId,
    sizeBytes: input.file.size,
  });
  await put(
    ticket.uploadUrl,
    input.file,
    HOSTED_VIDEO_CONTENT_TYPE,
    input.onProgress
  );
  if (ticket.requiresCompletionCall) {
    await service.completeHostedVideoUpload(input.academyId, ticket.assetId);
  }
  return { id: ticket.assetId, fileName: input.file.name };
}
