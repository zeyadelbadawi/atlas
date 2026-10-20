/**
 * B0-MED-05 — a File lesson's file goes to the protected tier: the dialog
 * uploads the picked file through `onUploadProtectedFile`, keeps the
 * returned asset for the save, hides the public-link field once a protected
 * file is attached, and says plainly when a legacy lesson still points at
 * a public file.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { ApiError } from '@api';
import { LessonFormDialog } from './components/LessonFormDialog';
import { MAX_PROTECTED_LESSON_FILE_BYTES } from './components/ProtectedLessonFileField';
import type { CourseLessonFormData } from './schemas/course.schemas';
import type { ProtectedLessonFile } from '@types';

vi.mock('@features/unsaved-changes', () => ({
  useDirtyGuard: () => ({
    requestClose: (close: () => void) => close(),
  }),
}));

const UPLOADED: ProtectedLessonFile = {
  id: 'asset-1',
  fileName: 'worksheet.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1200,
  access: 'protected',
};

function renderDialog(
  options: {
    contentUrl?: string;
    hasProtectedFile?: boolean;
    upload?: (file: File) => Promise<ProtectedLessonFile>;
    onSubmit?: (data: CourseLessonFormData) => void;
    /** The caller may not upload (a course instructor): no handler is passed. */
    readOnly?: boolean;
  } = {}
) {
  const upload = options.upload ?? vi.fn().mockResolvedValue(UPLOADED);
  const onSubmit = options.onSubmit ?? vi.fn();
  render(
    <AtlasLocalizationProvider initialLanguage="en">
      <LessonFormDialog
        open
        onOpenChange={vi.fn()}
        mode="edit"
        defaultValues={{
          title: 'Worksheet',
          description: '',
          contentType: 'file',
          contentUrl: options.contentUrl ?? '',
          status: 'draft',
          bodyHtml: '',
        }}
        isPending={false}
        onSubmit={onSubmit}
        onUploadProtectedFile={options.readOnly ? undefined : upload}
        hasProtectedFile={options.hasProtectedFile}
      />
    </AtlasLocalizationProvider>
  );
  return { upload, onSubmit };
}

const pick = (file: File) =>
  fireEvent.change(screen.getByTestId('protected-lesson-file-input'), {
    target: { files: [file] },
  });

afterEach(() => cleanup());

describe('File lesson — protected upload (B0-MED-05)', () => {
  it('uploads the picked file and submits the protected asset with the lesson', async () => {
    const onSubmit = vi.fn();
    const { upload } = renderDialog({ onSubmit });
    const file = new File(['%PDF-1.4'], 'worksheet.pdf', {
      type: 'application/pdf',
    });
    pick(file);
    await screen.findByText(
      'worksheet.pdf is uploaded. It will be attached when you save the lesson.'
    );
    expect(upload).toHaveBeenCalledWith(file);
    // The public-link field goes once a protected file is attached.
    expect(screen.queryByLabelText('Content URL')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      contentType: 'file',
      protectedFile: { mediaAssetId: 'asset-1', fileName: 'worksheet.pdf' },
    });
  });

  it('warns that a legacy lesson points at a public file', () => {
    renderDialog({ contentUrl: 'https://atlas.test/public/media/a/notes.pdf' });
    expect(
      screen.getByText(
        'This lesson links to a public file: anyone with the link can open it. Upload the file here to protect it.'
      )
    ).toBeTruthy();
  });

  it('says a protected file is already attached and offers to replace it', () => {
    renderDialog({ hasProtectedFile: true });
    expect(
      screen.getByText(
        'A protected file is attached. Only enrolled learners can open it. Upload a new one to replace it.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Replace file' })).toBeTruthy();
    expect(screen.queryByLabelText('Content URL')).toBeNull();
  });

  it('refuses a file over the limit without uploading it', async () => {
    const { upload } = renderDialog();
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', {
      value: MAX_PROTECTED_LESSON_FILE_BYTES + 1,
    });
    pick(big);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'That file is larger than 20 MB.'
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows the server's refusal (e.g. an instructor may not upload)", async () => {
    const upload = vi.fn().mockRejectedValue(
      new ApiError({
        kind: 'forbidden',
        messageKey: 'errors.media.insufficientRole',
        status: 403,
        retryable: false,
      })
    );
    renderDialog({ upload });
    pick(new File(['%PDF'], 'w.pdf', { type: 'application/pdf' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      "You don't have permission to upload files to this academy."
    );
  });

  it('offers no upload to someone who may not upload, and says who can', () => {
    renderDialog({ readOnly: true });
    expect(screen.queryByTestId('protected-lesson-file-input')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Upload file' })).toBeNull();
    expect(
      screen.getByText(
        'Only the academy owner or a manager can upload or replace the lesson file.'
      )
    ).toBeTruthy();
    // A link can still be pasted.
    expect(screen.getByLabelText('Content URL')).toBeTruthy();
  });

  it('still tells that reader a protected file is attached, without offering to replace it', () => {
    renderDialog({ readOnly: true, hasProtectedFile: true });
    expect(
      screen.getByText(
        'A protected file is attached. Only enrolled learners can open it.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Replace file' })).toBeNull();
    expect(screen.queryByLabelText('Content URL')).toBeNull();
  });
});
