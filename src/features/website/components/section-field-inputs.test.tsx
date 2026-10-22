/**
 * CMS phase 3d — the editor's new field kinds and section forms:
 * - `time` and `url` render the native input type with a visible label and
 *   helper text, and say what is wrong only once the author leaves the
 *   field (or after a refused Apply in the dialog);
 * - a new schedule row starts on Saturday with the day select labelled;
 * - a schedule row whose end is not after its start is refused at its end
 *   time; a valid one saves its exact `HH:MM` values;
 * - a sample result is cleared only through "This is a real result";
 * - a logo link must be a safe web address.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import { PlainInputField } from './section-field-inputs';
import type { SectionConfigMap, SectionType } from '@types';

vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
  useFaqLibraryEntries: () => [],
  useTestimonialLibraryEntries: () => [],
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({ data: undefined }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const i18n = createI18nInstance('en');
const lt = (en: string) => ({ en, ar: '' });

function renderForm<TType extends SectionType>(
  type: TType,
  initialConfig: SectionConfigMap[TType],
  onSave: (config: SectionConfigMap[TType]) => void = vi.fn(),
  variant: 'dialog' | 'panel' = 'dialog'
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
        variant={variant}
      />
    </I18nextProvider>
  );
}

afterEach(cleanup);

describe('PlainInputField', () => {
  const wrap = (node: JSX.Element) =>
    render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);

  it('a time field is a labelled native time input that waits for blur to show its problem', () => {
    wrap(
      <PlainInputField
        descriptor={{
          key: 'end',
          kind: 'time',
          labelKey: 'website:fields.scheduleEnd',
          hintKey: 'website:fields.scheduleEndHint',
        }}
        id="end"
        value="15:00"
        onChange={() => undefined}
        error="End time must be after the start time."
      />
    );
    const input = screen.getByLabelText('End time');
    expect(input.getAttribute('type')).toBe('time');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('end-hint');
    expect(screen.getByText('Must be later than the start time.')).toBeTruthy();
    expect(
      screen.queryByText('End time must be after the start time.')
    ).toBeNull();

    fireEvent.blur(input);
    expect(
      screen.getByText('End time must be after the start time.')
    ).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe('end-hint end-message');
  });

  it('a web address field uses the URL input and shows a refused Apply at once', () => {
    wrap(
      <PlainInputField
        descriptor={{
          key: 'url',
          kind: 'url',
          labelKey: 'website:fields.logoUrl',
        }}
        id="url"
        value="moe"
        onChange={() => undefined}
        error="Enter a valid URL"
        revealError
      />
    );
    const input = screen.getByLabelText('Link');
    expect(input.getAttribute('type')).toBe('url');
    expect(input.getAttribute('inputmode')).toBe('url');
    expect(screen.getByText('Enter a valid URL')).toBeTruthy();
  });
});

describe('SectionConfigForm — schedule', () => {
  it('a new row starts on Saturday, with every input labelled', async () => {
    const user = userEvent.setup({ delay: null });
    renderForm('schedule', { title: lt('Timetable'), items: [] });
    await user.click(screen.getByRole('button', { name: 'Add item' }));

    // The day select is named by its visible label.
    expect(screen.getByRole('combobox', { name: 'Day' }).textContent).toBe(
      'Saturday'
    );
    expect(screen.getByLabelText('Start time').getAttribute('type')).toBe(
      'time'
    );
    expect(screen.getByLabelText('End time').getAttribute('type')).toBe('time');
  });

  it('refuses an end that is not after the start, at the end time, and saves a valid row as typed', async () => {
    const onSave = vi.fn();
    renderForm(
      'schedule',
      {
        title: lt('Timetable'),
        items: [
          {
            id: 'r1',
            day: 'sun',
            start: '18:00',
            end: '17:00',
            title: lt('Physics'),
          },
        ],
      },
      onSave
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).not.toHaveBeenCalled();
    const end = screen.getByLabelText('End time');
    expect(end.getAttribute('aria-invalid')).toBe('true');
    // A refused Apply shows the message without waiting for blur.
    expect(
      screen.getAllByText(/End time must be after the start time/).length
    ).toBeGreaterThan(0);

    fireEvent.change(end, { target: { value: '19:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][0].items[0]).toMatchObject({
      day: 'sun',
      start: '18:00',
      end: '19:30',
    });
  });

  it('in the panel, a time problem appears only after leaving the field', () => {
    renderForm(
      'schedule',
      {
        title: lt('Timetable'),
        items: [
          { id: 'r1', day: 'sat', start: '18:00', end: '', title: lt('Math') },
        ],
      },
      vi.fn(),
      'panel'
    );
    const end = screen.getByLabelText('End time');
    expect(end.getAttribute('aria-invalid')).toBe('true');
    expect(end.getAttribute('aria-describedby')).toBe(
      'section-field-items-0-end-hint'
    );
    fireEvent.blur(end);
    expect(end.getAttribute('aria-describedby')).toContain(
      'section-field-items-0-end-message'
    );
  });
});

describe('SectionConfigForm — results and logos', () => {
  it('a sample result stays sample until "This is a real result"', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm(
      'results',
      {
        title: lt('Top students'),
        items: [
          {
            id: 'x1',
            studentName: 'Mariam A.',
            result: lt('99%'),
            sample: true,
          },
        ],
      },
      onSave
    );
    expect(
      screen.getByText(/Sample results are placeholders to show the design/)
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][0].items[0].sample).toBe(true);

    await user.click(
      screen.getByRole('button', { name: 'This is a real result' })
    );
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[1][0].items[0]).not.toHaveProperty('sample');
  });

  it('refuses a logo link that is not a safe web address', () => {
    const onSave = vi.fn();
    renderForm(
      'logos',
      {
        title: lt('Partners'),
        items: [
          {
            id: 'l1',
            image: '/api/v1/public/media/a1/logo.png',
            alt: lt('Ministry of Education'),
            url: 'javascript:alert(1)',
          },
        ],
      },
      onSave
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Link').getAttribute('aria-invalid')).toBe(
      'true'
    );
  });
});
