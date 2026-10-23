/**
 * CMS phase 3d (batch C) — the editors of the interest form, the notice
 * strip and the comparison, through the real section form:
 *   - the comparison's own field kind (`comparison`): columns 2–4 with one
 *     highlight, rows that open one at a time with a ✓ / ✗ / text choice
 *     per column, a removed column taking its cells with it, and problems
 *     named and opened;
 *   - the notice strip's button list holds one button (the `cta` slot);
 *   - the interest form's field modes and options use the shared controls,
 *     and every starter config is valid.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import { getDefaultSectionConfig } from '../sections/section-metadata.registry';
import { getSectionConfigSchema } from '../schemas/website-section.schemas';
import type { SectionConfigMap, SectionType } from '@types';

vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
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

function renderPanel<TType extends SectionType>(
  type: TType,
  config: SectionConfigMap[TType]
) {
  const onDraftChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <SectionConfigForm
        type={type}
        academyId="a1"
        initialConfig={config}
        pages={[]}
        configuration={{
          themeKey: 'modern-education',
          brand: {
            primaryColor: '221 83% 53%',
            secondaryColor: '221 83% 53%',
            accentColor: '221 83% 53%',
          },
        }}
        onSave={() => undefined}
        onCancel={() => undefined}
        isSaving={false}
        variant="panel"
        onDraftChange={onDraftChange}
      />
    </I18nextProvider>
  );
  const latest = () =>
    onDraftChange.mock.calls[onDraftChange.mock.calls.length - 1]![0];
  return { onDraftChange, latest };
}

afterEach(cleanup);

describe('starter content', () => {
  it.each(['interestForm', 'announcementBar', 'comparison'] as const)(
    '%s starts valid, in both languages',
    (type) => {
      const config = getDefaultSectionConfig(type);
      expect(getSectionConfigSchema(type).safeParse(config).success).toBe(true);
      const text = JSON.stringify(config);
      expect(text).toMatch(/"ar":"[^"]+"/);
    }
  );
});

const COMPARISON: SectionConfigMap['comparison'] = {
  title: lt('Compare'),
  columns: [
    { id: 'us', label: lt('Us'), highlighted: true },
    { id: 'them', label: lt('Them') },
  ],
  rows: [
    {
      id: 'r1',
      label: lt('Live classes'),
      cells: [
        { column: 'us', value: 'yes' },
        { column: 'them', value: 'no' },
      ],
    },
  ],
};

describe('the comparison grid editor', () => {
  const grid = () => screen.getByTestId('comparison-grid');

  it('keeps two to four columns and one highlight', async () => {
    const { latest } = renderPanel('comparison', COMPARISON);
    expect(
      within(grid())
        .getByRole('button', { name: 'Remove column “Us”' })
        .hasAttribute('disabled')
    ).toBe(true);
    const add = screen.getByTestId('comparison-add-column');
    await userEvent.click(add);
    await userEvent.click(add);
    expect(latest().columns).toHaveLength(4);
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(add.textContent).toMatch(/4 columns is the most/);

    const highlights = within(grid()).getAllByLabelText(
      'Highlight this column'
    );
    await userEvent.click(highlights[1]!);
    expect(latest().columns[0].highlighted).toBeUndefined();
    expect(latest().columns[1].highlighted).toBe(true);
  });

  it('summarises each closed row and edits one open row’s cells: ✓, ✗ or text', async () => {
    const { latest } = renderPanel('comparison', COMPARISON);
    const row = grid().querySelector('[data-row-index="0"]') as HTMLElement;
    expect(within(row).getByText('✓ · ✗')).toBeTruthy();
    await userEvent.click(
      within(row).getByRole('button', { name: /^Live classes/ })
    );

    const themGroup = within(row).getByRole('group', { name: 'Them' });
    await userEvent.click(
      within(themGroup).getByRole('radio', { name: 'Text' })
    );
    expect(latest().rows[0].cells[1]).toEqual({
      column: 'them',
      value: 'text',
      text: { en: '', ar: '' },
    });
    const english = within(themGroup).getByLabelText(/English/);
    fireEvent.change(english, { target: { value: 'Sometimes' } });
    expect(latest().rows[0].cells[1].text.en).toBe('Sometimes');

    await userEvent.click(
      within(themGroup).getByRole('button', { name: 'Clear this value' })
    );
    expect(latest().rows[0].cells).toEqual([{ column: 'us', value: 'yes' }]);
    expect(within(themGroup).getByText(/visitors see a dash/)).toBeTruthy();
  });

  it('removing a column removes its cells from every row', async () => {
    const { latest } = renderPanel('comparison', {
      ...COMPARISON,
      columns: [...COMPARISON.columns, { id: 'tutor', label: lt('Tutor') }],
      rows: [
        {
          ...COMPARISON.rows[0]!,
          cells: [
            ...COMPARISON.rows[0]!.cells,
            { column: 'tutor', value: 'yes' },
          ],
        },
      ],
    });
    await userEvent.click(
      within(grid()).getByRole('button', { name: 'Remove column “Tutor”' })
    );
    expect(latest().columns.map((column: { id: string }) => column.id)).toEqual(
      ['us', 'them']
    );
    expect(latest().rows[0].cells).toEqual([
      { column: 'us', value: 'yes' },
      { column: 'them', value: 'no' },
    ]);
    expect(
      getSectionConfigSchema('comparison').safeParse(latest()).success
    ).toBe(true);
  });

  it('adds rows up to fifteen and moves them with buttons', async () => {
    const { latest } = renderPanel('comparison', COMPARISON);
    const add = screen.getByTestId('comparison-add-row');
    for (let index = 0; index < 14; index += 1) {
      fireEvent.click(add);
    }
    expect(latest().rows).toHaveLength(15);
    expect(add.hasAttribute('disabled')).toBe(true);
    fireEvent.click(
      within(grid()).getByRole('button', {
        name: 'Move row “Live classes” down',
      })
    );
    expect(latest().rows[1].label.en).toBe('Live classes');
  });

  it('opens a row with a problem and names it in the summary', () => {
    renderPanel('comparison', {
      ...COMPARISON,
      rows: [
        ...COMPARISON.rows,
        {
          id: 'r2',
          label: lt('Answers'),
          cells: [{ column: 'us', value: 'text', text: lt('') }],
        },
      ],
    });
    expect(screen.getByTestId('section-form-issues').textContent).toMatch(
      /Row 2 · Text · English/
    );
    expect(screen.getByText('Needs a fix')).toBeTruthy();
    expect(
      document
        .getElementById('comparison-row-1-cell-0-text-en')
        ?.getAttribute('aria-invalid')
    ).toBe('true');
  });

  it('every control is at least 44px tall', () => {
    renderPanel('comparison', COMPARISON);
    for (const button of within(grid()).getAllByRole('button')) {
      expect(button.className).toMatch(/min-h-11|size-11/);
    }
  });
});

describe('the notice strip', () => {
  it('holds one button, in the `cta` slot', async () => {
    const { latest } = renderPanel('announcementBar', {
      text: lt('Registration is open'),
      tone: 'brand',
    });
    const buttons = screen.getByTestId('section-buttons');
    expect(within(buttons).getByText('0 of 1')).toBeTruthy();
    const add = screen.getByTestId('section-buttons-add');
    await userEvent.click(add);
    expect(latest().cta).toEqual({ label: { en: '', ar: '' } });
    expect(latest().secondaryCta).toBeUndefined();
    expect(add.hasAttribute('disabled')).toBe(true);
  });

  it('offers the three named tones, never a colour', () => {
    renderPanel('announcementBar', {
      text: lt('Registration is open'),
      tone: 'soft',
    });
    expect(screen.getByLabelText('Colour')).toBeTruthy();
    expect(
      screen.getByText('Your theme’s soft background, a quiet notice.')
    ).toBeTruthy();
  });
});

describe('the interest form editor', () => {
  it('shows each optional field’s mode with what it means, and the options as a list', () => {
    renderPanel('interestForm', getDefaultSectionConfig('interestForm'));
    expect(screen.getByLabelText('Email field')).toBeTruthy();
    expect(screen.getByLabelText('Choice list')).toBeTruthy();
    expect(screen.getByLabelText('Message field')).toBeTruthy();
    expect(
      screen.getByText(
        'Visitors must choose one of the options below. With no options, the list isn’t shown.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Choice list options')).toBeTruthy();
    expect(screen.getAllByText(/^Option \d$/)).toHaveLength(3);
  });

  it('names an empty option in the summary', () => {
    const config = getDefaultSectionConfig('interestForm');
    renderPanel('interestForm', {
      ...config,
      options: [{ id: 'o1', label: lt('') }],
    });
    expect(screen.getByTestId('section-form-issues').textContent).toMatch(
      /Option 1 · Option text · English/
    );
  });
});
