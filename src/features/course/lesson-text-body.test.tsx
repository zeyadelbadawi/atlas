/**
 * B0-LRN-01 — text lessons have a real body in the builder: the lesson
 * dialog shows a rich-text editor (not the URL field) for a text lesson,
 * requires the body, and submits it; an older lesson's description is
 * opened as escaped paragraphs.
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
import { LessonFormDialog } from './components/LessonFormDialog';
import { plainTextToLessonHtml } from './utils/lesson-body.utils';
import type { CourseLessonFormData } from './schemas/course.schemas';

vi.mock('@features/unsaved-changes', () => ({
  useDirtyGuard: () => ({
    requestClose: (close: () => void) => close(),
  }),
}));

function renderDialog(
  defaultValues: CourseLessonFormData | undefined,
  onSubmit = vi.fn(),
  extra: { bodyLoading?: boolean } = {}
) {
  render(
    <AtlasLocalizationProvider initialLanguage="en">
      <LessonFormDialog
        open
        onOpenChange={vi.fn()}
        mode={defaultValues ? 'edit' : 'create'}
        defaultValues={defaultValues}
        isPending={false}
        onSubmit={onSubmit}
        {...extra}
      />
    </AtlasLocalizationProvider>
  );
  return onSubmit;
}

const textLesson: CourseLessonFormData = {
  title: 'Reading 1',
  description: '',
  contentType: 'text',
  contentUrl: '',
  status: 'draft',
  bodyHtml: '',
};

afterEach(() => cleanup());

describe('lesson dialog — text body', () => {
  it('shows the body editor, not the URL field, for a text lesson', () => {
    renderDialog(textLesson);
    expect(screen.getByRole('textbox', { name: 'Lesson text' })).toBeTruthy();
    expect(screen.queryByLabelText('Content URL')).toBeNull();
  });

  it('refuses to save a text lesson without a body', async () => {
    const onSubmit = renderDialog(textLesson);
    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }));
    expect(
      await screen.findByText('Write the lesson text before saving.')
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the body typed into the editor', async () => {
    const onSubmit = renderDialog(textLesson);
    const editor = screen.getByRole('textbox', { name: 'Lesson text' });
    editor.innerHTML = '<p>Chapter one</p>';
    fireEvent.input(editor);
    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      contentType: 'text',
      bodyHtml: '<p>Chapter one</p>',
    });
  });

  it('opens an existing body for editing', async () => {
    renderDialog({ ...textLesson, bodyHtml: '<p>Saved reading</p>' });
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Lesson text' }).textContent
      ).toContain('Saved reading')
    );
  });

  it('blocks saving while the existing body is loading', () => {
    renderDialog(textLesson, vi.fn(), { bodyLoading: true });
    expect(screen.getByText('Loading the lesson text…')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Save Lesson' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('keeps the URL field for a video lesson and does not ask for a body', async () => {
    const onSubmit = renderDialog({
      ...textLesson,
      contentType: 'video',
      contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(screen.queryByRole('textbox', { name: 'Lesson text' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});

describe('plainTextToLessonHtml', () => {
  it('escapes markup and splits paragraphs', () => {
    expect(plainTextToLessonHtml('<b>Hi</b>\n\nLine one\nLine two')).toBe(
      '<p>&lt;b&gt;Hi&lt;/b&gt;</p><p>Line one<br>Line two</p>'
    );
    expect(plainTextToLessonHtml(null)).toBe('');
  });
});
