/**
 * CMS phase 3d — the editors with a field kind of their own, through the
 * real section form: a YouTube link stored as its video id (errors only
 * once the field is left), a deadline picked on the academy's clock and
 * stored with that zone's offset, and a pricing section's plans (one to
 * four, one "most popular", features with ✓ / ✗, a button each).
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
vi.mock('@features/academy', () => ({
  useAcademy: () => ({ data: { timezone: 'Africa/Cairo' } }),
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

describe('the YouTube link field', () => {
  it('stores a pasted link as its 11-character id, at once', () => {
    const { latest } = renderPanel('video', { videoId: '' });
    fireEvent.change(screen.getByLabelText('YouTube link'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s' },
    });
    expect(latest().videoId).toBe('dQw4w9WgXcQ');
    expect(screen.getByText('Video found')).toBeTruthy();
    expect(
      screen.getByAltText('Thumbnail of the chosen video').getAttribute('src')
    ).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('accepts youtu.be and Shorts links', () => {
    const { latest } = renderPanel('video', { videoId: '' });
    const input = screen.getByLabelText('YouTube link');
    fireEvent.change(input, { target: { value: 'youtu.be/dQw4w9WgXcQ?si=x' } });
    expect(latest().videoId).toBe('dQw4w9WgXcQ');
    fireEvent.change(input, {
      target: { value: 'https://youtube.com/shorts/aqz-KE-bpKQ' },
    });
    expect(latest().videoId).toBe('aqz-KE-bpKQ');
  });

  it('says what is wrong only once the field is left, and how to fix it', () => {
    renderPanel('video', { videoId: '' });
    const input = screen.getByLabelText('YouTube link');
    fireEvent.change(input, { target: { value: 'https://vimeo.com/1234' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    fireEvent.blur(input);
    expect(screen.getAllByRole('alert')[0]!.textContent).toMatch(
      /Paste a YouTube video link/
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a stored id as a link', () => {
    renderPanel('video', { videoId: 'dQw4w9WgXcQ' });
    expect(
      (screen.getByLabelText('YouTube link') as HTMLInputElement).value
    ).toBe('https://youtu.be/dQw4w9WgXcQ');
  });
});

describe('the deadline field', () => {
  it('reads the chosen time on the academy’s clock and stores it with that offset', () => {
    const { latest } = renderPanel('countdown', {
      title: lt('Closes soon'),
      deadline: '',
    });
    expect(screen.getByText(/No date yet/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Closes on'), {
      target: { value: '2027-01-15T23:59' },
    });
    // Cairo is UTC+2 in January.
    expect(latest().deadline).toBe('2027-01-15T23:59:00+02:00');
    expect(latest().timeZone).toBe('Africa/Cairo');
    expect(
      getSectionConfigSchema('countdown').safeParse(latest()).success
    ).toBe(true);
  });

  it('shows a stored deadline in the zone it was chosen in, and says when it has passed', () => {
    renderPanel('countdown', {
      title: lt('Closed'),
      deadline: '2024-05-01T09:30:00+03:00',
      timeZone: 'Africa/Cairo',
    });
    expect((screen.getByLabelText('Closes on') as HTMLInputElement).value).toBe(
      '2024-05-01T09:30'
    );
    expect(screen.getByText(/This date has passed/)).toBeTruthy();
  });

  it('clears the deadline', async () => {
    const { latest } = renderPanel('countdown', {
      title: lt('Soon'),
      deadline: '2030-05-01T09:30:00+03:00',
      timeZone: 'Africa/Cairo',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(latest().deadline).toBe('');
  });
});

describe('the pricing plans editor', () => {
  const plans = () =>
    within(screen.getByTestId('pricing-plans')).getAllByRole('listitem');

  it('starts with two bilingual plans, the second the most popular', () => {
    const config = getDefaultSectionConfig('pricing');
    expect(getSectionConfigSchema('pricing').safeParse(config).success).toBe(
      true
    );
    renderPanel('pricing', config);
    const rows = screen
      .getByTestId('pricing-plans')
      .querySelectorAll('[data-plan-index]');
    expect(rows).toHaveLength(2);
    expect(
      within(rows[1] as HTMLElement).getByText('Most popular')
    ).toBeTruthy();
    expect(screen.getByText('2 of 4')).toBeTruthy();
  });

  it('keeps one plan at least and four at most', async () => {
    const { latest } = renderPanel('pricing', {
      plans: [{ id: 'a', name: lt('A'), price: lt('1'), features: [] }],
    });
    expect(
      screen
        .getByRole('button', { name: 'Remove “A”' })
        .hasAttribute('disabled')
    ).toBe(true);
    const add = screen.getByTestId('pricing-plans-add');
    await userEvent.click(add);
    await userEvent.click(add);
    await userEvent.click(add);
    expect(latest().plans).toHaveLength(4);
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(add.textContent).toMatch(/4 plans is the most/);
  });

  it('lets only one plan be the most popular', async () => {
    const { latest } = renderPanel('pricing', {
      plans: [
        {
          id: 'a',
          name: lt('A'),
          price: lt('1'),
          features: [],
          highlighted: true,
        },
        { id: 'b', name: lt('B'), price: lt('2'), features: [] },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: /^B/ }));
    await userEvent.click(screen.getByLabelText('Mark as most popular'));
    expect(latest().plans[0].highlighted).toBeUndefined();
    expect(latest().plans[1].highlighted).toBe(true);
    expect(screen.getByText('Badge text (optional)')).toBeTruthy();
  });

  it('adds features, marks one as not included, and gives a plan a button', async () => {
    const { latest } = renderPanel('pricing', {
      plans: [{ id: 'a', name: lt('A'), price: lt('1'), features: [] }],
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a feature' })
    );
    expect(latest().plans[0].features).toEqual([
      expect.objectContaining({ included: true }),
    ]);
    await userEvent.click(screen.getByLabelText('Included in this plan'));
    expect(latest().plans[0].features[0].included).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Add a button' }));
    expect(latest().plans[0].cta).toEqual({ label: { en: '', ar: '' } });
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove the button' })
    );
    expect(latest().plans[0].cta).toBeUndefined();
  });

  it('opens a plan with a problem and names it in the summary', () => {
    renderPanel('pricing', {
      plans: [
        { id: 'a', name: lt('A'), price: lt('1'), features: [] },
        { id: 'b', name: lt(''), price: lt('2'), features: [] },
      ],
    });
    expect(screen.getByTestId('section-form-issues').textContent).toMatch(
      /Plan 2 · Plan name · English/
    );
    expect(screen.getByText('Needs a fix')).toBeTruthy();
    // The plan with the problem is open, its field marked.
    expect(
      document
        .getElementById('pricing-plan-1-name-en')
        ?.getAttribute('aria-invalid')
    ).toBe('true');
  });
});
