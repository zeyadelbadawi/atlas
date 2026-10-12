/**
 * B0-MED-01 — a video lesson takes a YouTube link only: the upload /
 * "Choose from library" control is gone for video (it posted to an upload
 * path that refuses every video), and the help text says uploading video
 * is not available yet. File lessons keep the library.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { LessonFormDialog } from './components/LessonFormDialog';
import type { CourseLessonFormData } from './schemas/course.schemas';

vi.mock('@features/unsaved-changes', () => ({
  useDirtyGuard: () => ({
    requestClose: (close: () => void) => close(),
  }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
}));

function renderDialog(contentType: CourseLessonFormData['contentType']) {
  render(
    <AtlasLocalizationProvider initialLanguage="en">
      <LessonFormDialog
        open
        onOpenChange={vi.fn()}
        mode="edit"
        academyId="academy-1"
        defaultValues={{
          title: 'Lesson',
          description: '',
          contentType,
          contentUrl: '',
          status: 'draft',
          bodyHtml: '',
        }}
        isPending={false}
        onSubmit={vi.fn()}
      />
    </AtlasLocalizationProvider>
  );
}

afterEach(() => cleanup());

describe('lesson dialog — video source', () => {
  it('offers no upload or library for a video lesson, and says why', () => {
    renderDialog('video');
    expect(
      screen.queryByRole('button', { name: 'Choose from library' })
    ).toBeNull();
    expect(
      screen.getByText(
        'Paste a YouTube link. Uploading videos to Atlas is not available yet.'
      )
    ).toBeTruthy();
    expect(screen.getByLabelText('Content URL')).toBeTruthy();
  });

  it('keeps the library for a file lesson', () => {
    renderDialog('file');
    expect(
      screen.getByRole('button', { name: 'Choose from library' })
    ).toBeTruthy();
  });
});
