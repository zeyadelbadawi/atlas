/**
 * Theme 1 plan §D.4 — in the editor, a sample testimonial stays sample
 * through every text edit; only the explicit "This is a real testimonial"
 * action clears it. The live preview labels it "Sample".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import type { TestimonialsSectionConfig } from '@types';

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

const CONFIG: TestimonialsSectionConfig = {
  title: lt('What learners say'),
  items: [
    {
      id: 's1',
      quote: lt('A placeholder quote'),
      authorName: 'Sample Person',
      sample: true,
    },
  ],
};

function renderForm(onSave: (config: TestimonialsSectionConfig) => void) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SectionConfigForm
        type="testimonials"
        academyId="a1"
        initialConfig={CONFIG}
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

afterEach(cleanup);

describe('SectionConfigForm — sample testimonials', () => {
  it('keeps `sample` when the text is edited', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm(onSave);

    const name = screen.getByDisplayValue('Sample Person');
    await user.clear(name);
    await user.type(name, 'Edited Name');
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));

    expect(onSave.mock.calls[0][0].items[0]).toMatchObject({
      authorName: 'Edited Name',
      sample: true,
    });
  });

  it('clears it only through "This is a real testimonial"', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm(onSave);

    // Labelled in the item header and in the live preview.
    expect(screen.getAllByText('Sample').length).toBeGreaterThanOrEqual(2);

    await user.click(
      screen.getByRole('button', { name: 'This is a real testimonial' })
    );
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));

    const saved = onSave.mock.calls[0][0].items[0];
    expect(saved).not.toHaveProperty('sample');
    expect(
      screen.queryByRole('button', { name: 'This is a real testimonial' })
    ).toBeNull();
    expect(within(document.body).queryAllByText('Sample')).toHaveLength(0);
  });
});
