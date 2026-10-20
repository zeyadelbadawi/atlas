/**
 * Text lessons are retired for new content (CF-01): "Add lesson" offers
 * Video and File only and starts on Video (a YouTube link), while an
 * existing text lesson still opens as Text with its body editor.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { LessonFormDialog } from './components/LessonFormDialog';
import type { CourseLessonFormData } from './schemas/course.schemas';

vi.mock('@features/unsaved-changes', () => ({
  useDirtyGuard: () => ({
    requestClose: (close: () => void) => close(),
  }),
}));

function renderDialog(defaultValues?: CourseLessonFormData) {
  render(
    <AtlasLocalizationProvider initialLanguage="en">
      <LessonFormDialog
        open
        onOpenChange={vi.fn()}
        mode={defaultValues ? 'edit' : 'create'}
        defaultValues={defaultValues}
        isPending={false}
        onSubmit={vi.fn()}
      />
    </AtlasLocalizationProvider>
  );
}

/** The content-type select is the first combobox in the dialog. */
async function openTypeOptions(): Promise<string[]> {
  const trigger = within(screen.getByRole('dialog')).getAllByRole(
    'combobox'
  )[0];
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const options = await screen.findAllByRole('option');
  return options.map((option) => option.textContent ?? '');
}

beforeAll(() => {
  // jsdom has no layout; Radix Select scrolls the selected option into view.
  Element.prototype.scrollIntoView ??= () => undefined;
});
afterEach(() => cleanup());

describe('lesson dialog — lesson types', () => {
  it('a new lesson starts as Video and is not offered Text', async () => {
    renderDialog();
    const trigger = within(screen.getByRole('dialog')).getAllByRole(
      'combobox'
    )[0];
    expect(trigger.textContent).toBe('Video');
    // Video takes a link, so the link field is there from the start.
    expect(screen.getByLabelText('Content URL')).toBeTruthy();
    expect(await openTypeOptions()).toEqual(['Video', 'File']);
  });

  it('an existing text lesson still opens as Text, with its body editor', async () => {
    renderDialog({
      title: 'Reading 1',
      description: '',
      contentType: 'text',
      contentUrl: '',
      status: 'draft',
      bodyHtml: '<p>Saved reading</p>',
    });
    const trigger = within(screen.getByRole('dialog')).getAllByRole(
      'combobox'
    )[0];
    expect(trigger.textContent).toBe('Text');
    expect(screen.getByRole('textbox', { name: 'Lesson text' })).toBeTruthy();
    expect(await openTypeOptions()).toEqual(['Text', 'Video', 'File']);
  });

  it('an existing video lesson is not offered Text either', async () => {
    renderDialog({
      title: 'Intro',
      description: '',
      contentType: 'video',
      contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'draft',
      bodyHtml: '',
    });
    expect(await openTypeOptions()).toEqual(['Video', 'File']);
  });
});
