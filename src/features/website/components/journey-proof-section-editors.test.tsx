/**
 * CMS phase 3d (batch D) — the editor for the timeline, video reviews,
 * downloads and certificates:
 * - `fileLink`: a labelled URL input with helper text that says what is
 *   wrong only after the field is left; "Choose from library" opens the
 *   media library for PDFs, and a picked file is shown by name (stored as
 *   its media address), replaceable and removable;
 * - a video review's `youtube` field (batch A's editor inside a repeatable
 *   item) stores a pasted link as its id;
 * - a milestone's icon select offers "No icon" first and a new milestone
 *   starts without one;
 * - a sample review stays sample until "This is a real review";
 * - an unsafe download link and a malformed year are refused at their field.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import { FileLinkField } from './FileLinkField';
import type { SectionConfigMap, SectionType } from '@types';

const libraryDialog = vi.hoisted(() => ({
  props: undefined as
    | undefined
    | {
        open: boolean;
        accept?: string;
        onSelect: (asset: { url: string; fileName: string }) => void;
      },
}));

vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({ data: undefined }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: (props: typeof libraryDialog.props) => {
    libraryDialog.props = props;
    return null;
  },
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const i18n = createI18nInstance('en');
const lt = (en: string) => ({ en, ar: '' });

function renderForm<TType extends SectionType>(
  type: TType,
  initialConfig: SectionConfigMap[TType],
  onSave: (config: SectionConfigMap[TType]) => void = vi.fn()
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SectionConfigForm
        type={type}
        academyId="a1"
        initialConfig={initialConfig}
        pages={[]}
        configuration={{
          themeKey: 'modern-education',
          brand: {
            primaryColor: '221 83% 53%',
            secondaryColor: '221 83% 53%',
            accentColor: '221 83% 53%',
          },
        }}
        onSave={onSave}
        onCancel={() => undefined}
        isSaving={false}
      />
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  libraryDialog.props = undefined;
});

describe('FileLinkField', () => {
  const wrap = (node: JSX.Element) =>
    render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);

  it('a labelled URL input with helper text, saying what is wrong only after leaving it', () => {
    wrap(
      <FileLinkField
        id="link"
        labelKey="website:fields.downloadLink"
        value="drive.google.com/notes"
        onChange={() => undefined}
        academyId="a1"
      />
    );
    const input = screen.getByLabelText('Link or file');
    expect(input.getAttribute('type')).toBe('url');
    expect(input.getAttribute('inputmode')).toBe('url');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('link-hint');
    expect(
      screen.getByText(/Paste a link \(such as Google Drive\)/)
    ).toBeTruthy();
    expect(screen.queryByText(/starts with https:\/\//)).toBeNull();

    fireEvent.blur(input);
    expect(
      screen.getByText(
        'Paste a web address that starts with https://, or choose a file from your media library.'
      )
    ).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe(
      'link-hint link-message'
    );
  });

  it('chooses a PDF from the media library, shows it by name, and can remove it', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();
    const { rerender } = wrap(
      <FileLinkField
        id="link"
        labelKey="website:fields.downloadLink"
        value=""
        onChange={onChange}
        academyId="a1"
      />
    );
    await user.click(
      screen.getByRole('button', { name: 'Choose from library' })
    );
    expect(libraryDialog.props?.open).toBe(true);
    expect(libraryDialog.props?.accept).toBe('application/pdf');
    libraryDialog.props!.onSelect({
      url: '/api/v1/public/media/academies/a1/notes.pdf',
      fileName: 'Term 1 notes.pdf',
    });
    expect(onChange).toHaveBeenCalledWith(
      '/api/v1/public/media/academies/a1/notes.pdf'
    );

    rerender(
      <I18nextProvider i18n={i18n}>
        <FileLinkField
          id="link"
          labelKey="website:fields.downloadLink"
          value="/api/v1/public/media/academies/a1/notes.pdf"
          onChange={onChange}
          academyId="a1"
        />
      </I18nextProvider>
    );
    // Shown by its name, not its address; the label names the replace button.
    expect(screen.getByText('Term 1 notes.pdf')).toBeTruthy();
    expect(screen.getByText('From your media library')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByLabelText('Link or file').textContent).toContain(
      'Choose another file'
    );
    await user.click(
      screen.getByRole('button', { name: 'Remove Term 1 notes.pdf' })
    );
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('SectionConfigForm — batch D sections', () => {
  it('a new milestone starts without an icon, and the select offers "No icon" first', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm('timeline', { title: lt('Path'), items: [] }, onSave);
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByRole('combobox', { name: 'Icon' }).textContent).toBe(
      'No icon (show the number)'
    );
    fireEvent.change(screen.getAllByLabelText(/English/)[2], {
      target: { value: 'Term 1' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].items[0]).toMatchObject({
      title: { en: 'Term 1' },
      icon: '',
    });
  });

  it('a video review stores a pasted YouTube link as its id', async () => {
    const onSave = vi.fn();
    renderForm(
      'videoTestimonials',
      {
        title: lt('Reviews'),
        items: [{ id: 'v1', videoId: '', name: 'Mona', role: lt('Parent') }],
      },
      onSave
    );
    const link = screen.getByLabelText('YouTube link');
    fireEvent.change(link, {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=4s' },
    });
    expect(screen.getByText('Video found')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][0].items[0].videoId).toBe('dQw4w9WgXcQ');
  });

  it('a sample review stays sample until "This is a real review"', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm(
      'videoTestimonials',
      {
        title: lt('Reviews'),
        items: [
          {
            id: 'v1',
            videoId: '',
            name: 'Mona H.',
            role: lt('Parent'),
            sample: true,
          },
        ],
      },
      onSave
    );
    expect(
      screen.getByText(/Sample reviews are placeholders to show the design/)
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][0].items[0].sample).toBe(true);
    await user.click(
      screen.getByRole('button', { name: 'This is a real review' })
    );
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[1][0].items[0]).not.toHaveProperty('sample');
  });

  it('refuses an unsafe download link at its field, after a refused Apply', () => {
    const onSave = vi.fn();
    renderForm(
      'downloads',
      {
        title: lt('Notes'),
        items: [{ id: 'd1', title: lt('Sheet'), url: 'javascript:alert(1)' }],
      },
      onSave
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).not.toHaveBeenCalled();
    const input = screen.getByLabelText('Link or file');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(
      screen.getAllByText(/Paste a web address that starts with https:\/\//)
        .length
    ).toBeGreaterThan(0);
  });

  it('refuses a malformed certificate year and saves a valid one', () => {
    const onSave = vi.fn();
    renderForm(
      'certificates',
      {
        title: lt('Certificates'),
        items: [
          {
            id: 'c1',
            image: '/api/v1/public/media/academies/a1/iso.png',
            title: lt('ISO 9001'),
            year: '25',
          },
        ],
      },
      onSave
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).not.toHaveBeenCalled();
    const year = screen.getByLabelText('Year (optional)');
    expect(year.getAttribute('aria-invalid')).toBe('true');
    expect(
      screen.getAllByText('Enter a four-digit year, such as 2025.').length
    ).toBeGreaterThan(0);
    fireEvent.change(year, { target: { value: '2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][0].items[0].year).toBe('2025');
  });
});
