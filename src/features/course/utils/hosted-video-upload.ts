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

/**
 * Why the browser-to-storage part of an upload stopped. `transfer`: the
 * storage refused or the connection failed (the API never saw it, so there
 * is no server message to show); `cancelled`: the author cancelled.
 */
export class HostedVideoUploadError extends Error {
  constructor(readonly reason: 'transfer' | 'cancelled') {
    super(`hosted video upload ${reason}`);
    this.name = 'HostedVideoUploadError';
  }
}

export function isHostedVideoUploadError(
  error: unknown
): error is HostedVideoUploadError {
  return error instanceof HostedVideoUploadError;
}

/** PUTs a file to a presigned URL, reporting progress (0–100); `signal` aborts it. */
export function putFileWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new HostedVideoUploadError('cancelled'));
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const settle = (error?: HostedVideoUploadError) => {
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve();
    };
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      settle(
        xhr.status >= 200 && xhr.status < 300
          ? undefined
          : new HostedVideoUploadError('transfer')
      );
    xhr.onerror = () => settle(new HostedVideoUploadError('transfer'));
    xhr.onabort = () => settle(new HostedVideoUploadError('cancelled'));
    xhr.send(file);
  });
}

export interface UploadedHostedVideo {
  readonly id: string;
  readonly fileName: string;
}

/** What the upload is doing now: sending bytes, or the server checking them. */
export type HostedVideoUploadPhase = 'uploading' | 'processing';

/** What the builder's upload control passes along with the file. */
export interface HostedVideoUploadOptions {
  readonly signal?: AbortSignal;
  readonly onPhase?: (phase: HostedVideoUploadPhase) => void;
}

export async function uploadHostedVideo(
  service: Pick<
    CourseService,
    'createHostedVideoUpload' | 'completeHostedVideoUpload'
  > &
    Partial<Pick<CourseService, 'cancelHostedVideoUpload'>>,
  input: {
    readonly academyId: string;
    readonly courseId: string;
    readonly file: File;
    readonly onProgress?: (percent: number) => void;
    /** Aborts the transfer; the reservation is then released. */
    readonly signal?: AbortSignal;
    readonly onPhase?: (phase: HostedVideoUploadPhase) => void;
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
  if (input.signal?.aborted) throw new HostedVideoUploadError('cancelled');
  const ticket = await service.createHostedVideoUpload(input.academyId, {
    fileName: input.file.name,
    maxDurationSeconds,
    courseId: input.courseId,
    sizeBytes: input.file.size,
  });
  try {
    input.onPhase?.('uploading');
    await put(
      ticket.uploadUrl,
      input.file,
      HOSTED_VIDEO_CONTENT_TYPE,
      input.onProgress,
      ...(input.signal ? [input.signal] : [])
    );
    if (ticket.requiresCompletionCall) {
      input.onPhase?.('processing');
      await service.completeHostedVideoUpload(input.academyId, ticket.assetId);
    }
  } catch (error) {
    // The quota was reserved when the ticket was issued. A transfer that
    // failed or was cancelled, or a completion the server refused, must not
    // keep holding it (the server releases a refused completion itself;
    // the call is idempotent). Best effort: the server's abandoned-upload
    // sweep releases it a day later if this call cannot get through.
    await service
      .cancelHostedVideoUpload?.(input.academyId, ticket.assetId)
      .catch(() => undefined);
    throw error;
  }
  return { id: ticket.assetId, fileName: input.file.name };
}
