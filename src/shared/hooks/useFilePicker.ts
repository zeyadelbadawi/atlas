/**
 * useFilePicker hook.
 *
 * Provides a programmatic file picker interface with preview support.
 */
import { useCallback, useRef, useState } from 'react';

export interface FilePickerOptions {
  /** Allowed MIME types. */
  readonly accept?: string;

  /** Whether to allow multiple files. */
  readonly multiple?: boolean;

  /** Whether to capture from camera (mobile). */
  readonly capture?: boolean | 'user' | 'environment';
}

export interface UseFilePickerResult {
  /** Opens the file picker dialog. */
  readonly openFilePicker: () => void;

  /** Selected files. */
  readonly files: File[] | null;

  /** Clears selected files. */
  readonly clearFiles: () => void;

  /** Generates a preview URL for a file. */
  readonly getPreviewUrl: (file: File) => string;

  /** Revokes a preview URL. */
  readonly revokePreviewUrl: (url: string) => void;
}

export function useFilePicker(
  options: FilePickerOptions = {}
): UseFilePickerResult {
  const { accept, multiple = false, capture } = options;
  const [files, setFiles] = useState<File[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    if (!inputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept ?? '*';
      input.multiple = multiple;
      if (capture) {
        input.capture = typeof capture === 'string' ? capture : '';
      }
      input.style.display = 'none';

      input.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          setFiles(Array.from(target.files));
        }
      });

      document.body.appendChild(input);
      inputRef.current = input;
    }

    inputRef.current.click();
  }, [accept, multiple, capture]);

  const clearFiles = useCallback(() => {
    setFiles(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const getPreviewUrl = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  const revokePreviewUrl = useCallback((url: string): void => {
    URL.revokeObjectURL(url);
  }, []);

  return {
    openFilePicker,
    files,
    clearFiles,
    getPreviewUrl,
    revokePreviewUrl,
  };
}