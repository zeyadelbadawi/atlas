/**
 * CMS phase 3c — the custom section's editor (field kind `customLayout`):
 * - the layout is a labelled group of radio cards; two columns add the
 *   width choice; going to fewer columns moves the extra elements into the
 *   last column kept (nothing is lost) and says so;
 * - "Add element" is a menu of the kinds with their names; a new element
 *   opens, and focus goes to its row;
 * - elements reorder with Move up / Move down buttons, and duplicate, move
 *   to another column and remove from their menu;
 * - a field's problem shows only once it has been left (or after a refused
 *   Apply), saying how to fix it, and the summary names the column and
 *   element;
 * - what is applied is the schema's parse: the API's own contract.
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
import {
  columnsForLayout,
  duplicateCustomElement,
  resolveCustomLayoutIssue,
} from './custom-section/custom-elements';
import type { CustomSectionConfig } from '@types';

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

function renderForm(
  initialConfig: CustomSectionConfig,
  onSave: (config: CustomSectionConfig) => void = vi.fn(),
  variant: 'dialog' | 'panel' = 'dialog'
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SectionConfigForm
        type="custom"
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

const TWO: CustomSectionConfig = {
  layout: 'two',
  columns: [
    {
      id: 'c1',
      elements: [
        { id: 'h', kind: 'heading', level: 'h2', text: lt('Small groups') },
        { id: 't', kind: 'text', text: lt('Ten students at most.') },
      ],
    },
    {
      id: 'c2',
      elements: [{ id: 'd', kind: 'divider' }],
    },
  ],
};

const editor = () => screen.getByTestId('custom-section-editor');
const column = (number: number) =>
  editor().querySelector<HTMLElement>(
    `[data-custom-column-editor="${number}"]`
  )!;
const rowKinds = (number: number) =>
  [...column(number).querySelectorAll('[data-element-kind]')].map((row) =>
    row.getAttribute('data-element-kind')
  );

afterEach(cleanup);

describe('custom section editor model', () => {
  it('a layout change never loses an element', () => {
    const three = columnsForLayout(TWO.columns, 'three');
    expect(three.columns).toHaveLength(3);
    expect(three.columns[2].elements).toEqual([]);
    const one = columnsForLayout(TWO.columns, 'one');
    expect(one.moved).toBe(1);
    expect(one.columns[0].elements.map((e) => e.id)).toEqual(['h', 't', 'd']);
  });

  it('a duplicate gets fresh ids, its checklist items too', () => {
    const copy = duplicateCustomElement({
      id: 'l',
      kind: 'checklist',
      items: [{ id: 'x', text: lt('Tests') }],
    });
    expect(copy.id).not.toBe('l');
    expect(copy.kind === 'checklist' && copy.items[0].id).not.toBe('x');
    expect(copy.kind === 'checklist' && copy.items[0].text).toEqual(
      lt('Tests')
    );
  });

  it('names a problem by its column, element and part', () => {
    expect(
      resolveCustomLayoutIssue('columns', ['1', 'elements', '0', 'text'], {
        columns: [
          { id: 'a', elements: [] },
          {
            id: 'b',
            elements: [{ id: 'h', kind: 'heading', level: 'h2', text: lt('') }],
          },
        ],
      })
    ).toEqual({
      labelKeys: [
        'website:sectionEditors.custom.column',
        'website:sectionEditors.custom.kinds.heading',
        'website:sectionEditors.custom.fields.text',
      ],
      itemNumber: 2,
      maxLength: 120,
    });
  });
});

describe('custom section editor', () => {
  it('chooses the layout from labelled cards; fewer columns keep every element and say so', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderForm(TWO, onSave);
    const layout = within(screen.getByTestId('custom-layout'));
    expect(screen.getByRole('group', { name: 'Layout' })).toBeTruthy();
    expect(
      (layout.getByRole('radio', { name: 'Two columns' }) as HTMLInputElement)
        .checked
    ).toBe(true);
    // Two columns offer their widths.
    expect(screen.getByRole('group', { name: 'Column widths' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'First wider' }));

    await user.click(layout.getByRole('radio', { name: 'One column' }));
    expect(screen.queryByRole('group', { name: 'Column widths' })).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(
      /1 element moved to column 1/
    );
    expect(rowKinds(1)).toEqual(['heading', 'text', 'divider']);

    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as CustomSectionConfig;
    expect(saved.layout).toBe('one');
    expect(saved.columns).toHaveLength(1);
    expect(saved.ratio).toBeUndefined();
  });

  it('adds an element from a menu of the kinds; the new one opens and its row takes focus', async () => {
    const user = userEvent.setup();
    renderForm(TWO);
    await user.click(
      screen.getByRole('button', { name: 'Add element to column 2' })
    );
    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual([
      'Heading',
      'Text',
      'Buttons',
      'Image',
      'YouTube video',
      'Checklist',
      'Icon with text',
      'Space',
      'Divider',
    ]);
    await user.click(within(menu).getByRole('menuitem', { name: 'Checklist' }));
    expect(rowKinds(2)).toEqual(['divider', 'checklist']);
    const row = column(2).querySelector('[data-element-kind="checklist"]')!;
    const toggle = row.querySelector<HTMLElement>('[data-element-toggle]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await vi.waitFor(() => expect(document.activeElement).toBe(toggle));
    // Its fields: the first item, labelled, and a way to add more.
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add an item' })).toBeTruthy();
  });

  it('reorders with buttons, keeping focus on the row that moved', async () => {
    const user = userEvent.setup();
    renderForm(TWO);
    const down = screen.getByRole('button', {
      name: 'Move “Heading: Small groups” down',
    });
    expect(
      (
        screen.getByRole('button', {
          name: 'Move “Heading: Small groups” up',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    await user.click(down);
    expect(rowKinds(1)).toEqual(['text', 'heading']);
    // Now last: its own "down" is disabled, so focus moved to its "up".
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        'Move “Heading: Small groups” up'
      )
    );
  });

  it('duplicates, moves to another column and removes from the element’s menu', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderForm(TWO, onSave);
    const more = () =>
      screen.getByRole('button', {
        name: 'More actions for “Text: Ten students at most.”',
      });

    await user.click(more());
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', {
        name: 'Duplicate',
      })
    );
    expect(rowKinds(1)).toEqual(['heading', 'text', 'text']);

    await user.click(
      screen.getAllByRole('button', {
        name: 'More actions for “Text: Ten students at most.”',
      })[1]
    );
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', {
        name: 'Move to column 2',
      })
    );
    expect(rowKinds(1)).toEqual(['heading', 'text']);
    expect(rowKinds(2)).toEqual(['divider', 'text']);
    expect(screen.getByRole('status').textContent).toBe('Moved to column 2.');

    await user.click(
      screen.getByRole('button', { name: 'More actions for “Divider”' })
    );
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', {
        name: 'Remove',
      })
    );
    expect(rowKinds(2)).toEqual(['text']);

    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    const saved = onSave.mock.calls[0][0] as CustomSectionConfig;
    const ids = saved.columns.flatMap((c) => c.elements.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows a field’s problem once it is left, saying how to fix it; a refused Apply names it in the summary', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderForm(
      {
        layout: 'one',
        columns: [
          {
            id: 'c1',
            elements: [{ id: 'h', kind: 'heading', level: 'h2', text: lt('') }],
          },
        ],
      },
      onSave,
      'panel'
    );
    await user.click(
      column(1).querySelector<HTMLElement>('[data-element-toggle]')!
    );
    const input = screen.getByLabelText(/^English/, {
      selector: '#custom-h-text-en',
    });
    // Not while it is being filled in…
    expect(
      screen.queryByText('Heading is required.', { exact: false })
    ).toBeNull();
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    // …but once it has been left.
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(
      column(1).querySelector('[data-element-kind="heading"]')!.textContent
    ).toContain('Needs a fix');
    // The panel's summary names where it is.
    expect(screen.getByTestId('section-form-issues').textContent).toMatch(
      /Column 1 · Heading · Text · English: Text is required/
    );
    // Under the field: what to do.
    expect(screen.getByText('Heading is required')).toBeTruthy();
    // Heading levels: a labelled choice.
    expect(screen.getByRole('group', { name: 'Heading level' })).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('a button element uses the section buttons editor, and its problems are its own', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderForm(
      {
        layout: 'one',
        columns: [
          {
            id: 'c1',
            elements: [
              {
                id: 'b',
                kind: 'button',
                cta: { label: lt('Go'), url: 'javascript:alert(1)' },
              },
            ],
          },
        ],
      },
      onSave
    );
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).not.toHaveBeenCalled();
    // The refused Apply opens the element with the problem.
    expect(
      column(1)
        .querySelector('[data-element-toggle]')!
        .getAttribute('aria-expanded')
    ).toBe('true');
    expect(screen.getByRole('group', { name: /Buttons/ })).toBeTruthy();
    expect(screen.getByTestId('section-form-issues').textContent).toMatch(
      /Column 1 · Buttons · Button/
    );
  });
});
