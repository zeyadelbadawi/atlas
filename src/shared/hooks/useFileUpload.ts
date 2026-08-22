/**
 * useFileUpload hook.
 *
 * Provides file upload infrastructure with progress tracking, cancellation and
 * validation. Use this for any file upload operation.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, createApiError } from '@api';
import type { ApiError } from '@api';

export interface FileUploadOptions {
  /** Maximum file size in bytes. */
  readonly maxSize?: number;

  /** Allowed MIME types. */
  readonly allowedTypes?: readonly string[];

  /** Whether to allow multiple files. */
  readonly multiple?: boolean;

  /** Callback invoked on upload progress. */
  readonly onProgress?: (progress: number) => void;

  /** Callback invoked on upload success. */
  readonly onSuccess?: (response: unknown) => void;

  /** Callback invoked on upload error. */
  readonly onError?: (error: ApiError) => void;
}

export interface UseFileUploadResult {
  /** Uploads files to the specified endpoint. */
  readonly upload: (endpoint: string, files: FileList | File[]) => Promise<void>;

  /** Cancels the current upload. */
  readonly cancel: () => void;

  /** True while upload is in progress. */
  readonly isUploading: boolean;

  /** Upload progress (0-100). */
  readonly progress: number;

  /** The error from the last failed upload, if any. */
  readonly error: ApiError | null;

  /** Clears the error state. */
  readonly clearError: () => void;
}

export function useFileUpload(
  options: FileUploadOptions = {}
): UseFileUploadResult {
  const {
    maxSize,
    allowedTypes,
    multiple = false,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  const validateFiles = useCallback(
    (files: File[]): string | null => {
      if (!multiple && files.length > 1) {
        return 'validation:upload.multipleNotAllowed';
      }

      for (const file of files) {
        if (maxSize && file.size > maxSize) {
          return 'validation:upload.fileTooLarge';
        }

        if (allowedTypes && !allowedTypes.includes(file.type)) {
          return 'validation:upload.invalidType';
        }
      }

      return null;
    },
    [maxSize, allowedTypes, multiple]
  );

  const upload = useCallback(
    async (endpoint: string, filesInput: FileList | File[]) => {
      const files = Array.from(filesInput);
      const validationError = validateFiles(files);

      if (validationError) {
        const error = createApiError('validation', {
          messageKey: validationError,
        });
        setError(error);
        onError?.(error);
        return;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(multiple ? `files[${index}]` : 'file', file);
      });

      abortControllerRef.current = new AbortController();

      try {
        // Simulate progress for now; real progress requires server-sent events or polling.
        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            const newProgress = Math.min(prev + 10, 90);
            onProgress?.(newProgress);
            return newProgress;
          });
        }, 200);

        const response = await apiClient.upload(endpoint, formData, {
          signal: abortControllerRef.current.signal,
        });

        // Clear interval and set final progress.
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setProgress(100);
        onProgress?.(100);
        onSuccess?.(response);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        onError?.(apiError);
      } finally {
        // Ensure interval is cleared in all paths.
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [validateFiles, multiple, onSuccess, onError, onProgress]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsUploading(false);
    setProgress(0);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    upload,
    cancel,
    isUploading,
    progress,
    error,
    clearError,
  };
}