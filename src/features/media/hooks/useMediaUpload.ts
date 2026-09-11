/**
 * The upload, as something the user can watch.
 *
 * WHAT WAS WRONG. Choosing a file produced no visible change at all. The
 * browser read it, encoded it and posted it with nothing on screen, so the
 * only honest thing a user could conclude from a large file was that the
 * page had frozen — and the natural response to that is to click Upload
 * again, which is how you get duplicates.
 *
 * THREE STAGES, AND ONLY TWO OF THEM CAN BE MEASURED. This is the whole
 * design, and it is why the progress here is not one number:
 *
 *   - `reading`   the browser turning the file into a data URL.
 *                 `FileReader` reports real bytes → REAL percentage.
 *   - `uploading` the request going out. axios reports real bytes sent →
 *                 REAL percentage.
 *   - `processing` the server validating magic bytes, writing to object
 *                 storage and creating the row. There is NO signal here at
 *                 all, so the UI shows an indeterminate state and says what
 *                 is happening. Animating a bar to 99% during this would be
 *                 inventing information, and the moment it stalls at 99%
 *                 the user learns the whole bar was decorative.
 *
 * Progress is reported per stage rather than blended into one percentage,
 * because blending requires guessing how long the unmeasurable stage takes
 * relative to the others — a guess the UI would then present as fact.
 */
import { useCallback, useRef, useState } from 'react';
import { mediaService } from '../services/MediaService';
import type { ApiError } from '@api';
import type { MediaAssetDetail } from '@types';

export type MediaUploadStage =
  | 'idle'
  | 'reading'
  | 'uploading'
  | 'processing'
  | 'succeeded'
  | 'failed';

export interface MediaUploadState {
  readonly stage: MediaUploadStage;
  readonly fileName?: string;
  readonly fileSizeBytes?: number;
  /** 0–100 for the MEASURABLE stages only; `undefined` means indeterminate — never a guess. */
  readonly percent?: number;
  readonly error?: ApiError;
}

const IDLE: MediaUploadState = { stage: 'idle' };

/** Reads a `File` into a data URL, reporting real progress as it goes. */
function readAsDataUrl(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      // `lengthComputable` is the browser telling us whether a denominator
      // exists. Without one there is no percentage to report.
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}

export interface UseMediaUploadResult {
  readonly state: MediaUploadState;
  /** Starts an upload. A second call while one is running is ignored — see below. */
  readonly upload: (file: File) => Promise<MediaAssetDetail | undefined>;
  /** Retries the last failed file. */
  readonly retry: () => Promise<MediaAssetDetail | undefined>;
  /** Returns to idle, clearing a success or error banner. */
  readonly reset: () => void;
  readonly isBusy: boolean;
}

export function useMediaUpload(academyId: string): UseMediaUploadResult {
  const [state, setState] = useState<MediaUploadState>(IDLE);

  /*
    Guards against a second upload starting while one is in flight.

    A ref, not the state value: React batches state updates, so two clicks
    in the same tick would both read the same stale `stage` and both
    proceed — which is precisely the duplicate-upload this is here to
    prevent. A ref is written synchronously.
  */
  const busyRef = useRef(false);
  const lastFileRef = useRef<File | null>(null);

  const run = useCallback(
    async (file: File): Promise<MediaAssetDetail | undefined> => {
      if (busyRef.current || !academyId) return undefined;
      busyRef.current = true;
      lastFileRef.current = file;

      setState({
        stage: 'reading',
        fileName: file.name,
        fileSizeBytes: file.size,
        percent: 0,
      });

      try {
        const dataUrl = await readAsDataUrl(file, (percent) =>
          setState((prev) =>
            prev.stage === 'reading' ? { ...prev, percent } : prev,
          ),
        );

        setState((prev) => ({ ...prev, stage: 'uploading', percent: 0 }));

        const asset = await mediaService.uploadAsset(
          academyId,
          {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl,
          },
          {
            // A base64 payload is ~33% larger than the file and a slow
            // connection makes this the longest stage, so the default
            // request timeout is not appropriate here.
            timeoutMs: UPLOAD_TIMEOUT_MS,
            onUploadProgress: ({ loaded, total }) => {
              setState((prev) => {
                if (prev.stage !== 'uploading') return prev;
                // Once every byte is sent the server is working and we can
                // no longer measure anything — switch to the honest
                // indeterminate stage rather than sitting at 100%.
                if (total && loaded >= total) {
                  return { ...prev, stage: 'processing', percent: undefined };
                }
                return {
                  ...prev,
                  percent: total ? Math.round((loaded / total) * 100) : undefined,
                };
              });
            },
          },
        );

        setState({
          stage: 'succeeded',
          fileName: file.name,
          fileSizeBytes: file.size,
        });
        return asset;
      } catch (error) {
        setState({
          stage: 'failed',
          fileName: file.name,
          fileSizeBytes: file.size,
          error: error as ApiError,
        });
        return undefined;
      } finally {
        busyRef.current = false;
      }
    },
    [academyId],
  );

  const retry = useCallback(async () => {
    const file = lastFileRef.current;
    if (!file) return undefined;
    return run(file);
  }, [run]);

  const reset = useCallback(() => {
    if (busyRef.current) return;
    lastFileRef.current = null;
    setState(IDLE);
  }, []);

  return {
    state,
    upload: run,
    retry,
    reset,
    isBusy:
      state.stage === 'reading' ||
      state.stage === 'uploading' ||
      state.stage === 'processing',
  };
}

/** Generous, because a large file on a slow connection is a real case, not an error. */
const UPLOAD_TIMEOUT_MS = 120_000;
