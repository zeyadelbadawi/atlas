/**
 * CMS phase 3 — a section's buttons in the editor: up to three, added,
 * moved and removed as a list, each going to a page, a course, a link,
 * WhatsApp, a call or the sign-up page, with a look of its own. They are
 * stored in the `cta` / `secondaryCta` / `tertiaryCta` slots.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
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

const rows = () =>
  within(screen.getByTestId('section-buttons')).getAllByRole('listitem');

afterEach(cleanup);

describe('section buttons in the editor', () => {
  it('lists the buttons a section already has, and where they go', () => {
    renderPanel('hero', {
      title: lt('Learn'),
      cta: { label: lt('Courses'), url: 'https://example.com/courses' },
      secondaryCta: { label: lt('Chat'), whatsapp: '+201001234567' },
    });
    expect(screen.getByText('2 of 3')).toBeTruthy();
    expect(rows()).toHaveLength(2);
    expect(within(rows()[0]!).getByText('example.com')).toBeTruthy();
    expect(within(rows()[1]!).getByText(/^\+20 /)).toBeTruthy();
  });

  it('adds a third button, and no more than three', async () => {
    const user = userEvent.setup({ delay: null });
    const { latest } = renderPanel('hero', {
      title: lt('Learn'),
      cta: { label: lt('One'), pageId: 'p1' },
      secondaryCta: { label: lt('Two'), pageId: 'p1' },
    });
    await user.click(screen.getByTestId('section-buttons-add'));
    expect(rows()).toHaveLength(3);
    expect(latest().tertiaryCta).toEqual({ label: lt('') });
    expect(
      (screen.getByTestId('section-buttons-add') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('moves and removes buttons without leaving a gap', async () => {
    const user = userEvent.setup({ delay: null });
    const { latest } = renderPanel('cta', {
      title: lt('Join'),
      cta: { label: lt('One'), pageId: 'p1' },
      secondaryCta: { label: lt('Two'), phone: '19999' },
      tertiaryCta: { label: lt('Three'), authAction: 'signUp' },
    });
    await user.click(screen.getByRole('button', { name: 'Move “Three” up' }));
    expect(latest().secondaryCta.label.en).toBe('Three');
    expect(latest().tertiaryCta.label.en).toBe('Two');

    await user.click(screen.getByRole('button', { name: 'Remove “One”' }));
    expect(latest().cta.label.en).toBe('Three');
    expect(latest().cta.authAction).toBe('signUp');
    expect(latest().secondaryCta.label.en).toBe('Two');
    expect(latest().tertiaryCta).toBeUndefined();
  });

  it('keeps the one button a CTA band needs', async () => {
    renderPanel('cta', {
      title: lt('Join'),
      cta: { label: lt('Only'), pageId: 'p1' },
    });
    expect(
      (
        screen.getByRole('button', {
          name: 'Remove “Only”',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      screen.getByText('This section always keeps at least one button.')
    ).toBeTruthy();
  });

  it('gives a button its own look, and back to automatic', async () => {
    const user = userEvent.setup({ delay: null });
    const { latest } = renderPanel('about', {
      title: lt('About'),
      body: lt('We teach.'),
      cta: { label: lt('Courses'), pageId: 'p1' },
    });
    // A single button opens ready to edit.
    await user.click(screen.getByRole('radio', { name: /Text link/ }));
    expect(latest().cta.style).toBe('link');
    await user.click(screen.getByRole('radio', { name: /Automatic/ }));
    expect(latest().cta).not.toHaveProperty('style');
  });

  it('says when a button is not linked yet', () => {
    renderPanel('featureSplit', {
      title: lt('Why us'),
      imagePosition: 'start',
      items: [],
      cta: { label: lt('Chat'), whatsapp: '' },
      secondaryCta: { label: lt('More'), pageId: 'p1' },
    });
    expect(within(rows()[0]!).getByText(/Not linked yet/)).toBeTruthy();
  });
});
