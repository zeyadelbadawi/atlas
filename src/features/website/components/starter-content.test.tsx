/**
 * Theme 1 plan Phase 7 — starter content in the dashboard (§D.4):
 * - the publish warning lists every section still holding sample
 *   testimonials, links each one to review, and publishes anyway on
 *   request (a warning, never a block);
 * - without samples, publishing keeps the ordinary confirmation;
 * - the overview's launch checklist derives each step from saved state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import { BRAND_ROLE_NAMES } from '../brand-engine';
import { WebsitePublishBar } from './WebsitePublishBar';
import { WebsiteLaunchChecklist } from './WebsiteLaunchChecklist';

let pages: WebsitePage[] = [];
const publishMutate = vi.fn();
const confirm = vi.fn();

vi.mock('../hooks', () => ({
  useWebsitePages: () => ({ data: { items: pages } }),
  usePublishWebsite: () => ({
    mutate: publishMutate,
    isPending: false,
    error: null,
  }),
  useUnpublishWebsite: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
}));

const i18n = createI18nInstance('en');
const wrap = (children: ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nextProvider>
  );

const testimonials = (id: string, samples: number, real = 0) => ({
  id,
  type: 'testimonials',
  enabled: true,
  visibility: { desktop: true, tablet: true, mobile: true },
  config: {
    items: [
      ...Array.from({ length: samples }, (_, index) => ({
        id: `${id}-s${index}`,
        quote: { en: 'Q', ar: '' },
        authorName: 'A',
        sample: true,
      })),
      ...Array.from({ length: real }, (_, index) => ({
        id: `${id}-r${index}`,
        quote: { en: 'Q', ar: '' },
        authorName: 'A',
      })),
    ],
  },
});

const page = (id: string, title: string, sections: unknown[]) =>
  ({ id, title, sections }) as unknown as WebsitePage;

beforeEach(() => {
  pages = [];
  publishMutate.mockReset();
  confirm.mockReset();
});
afterEach(cleanup);

describe('publish warning (§D.4)', () => {
  it('lists each section with sample testimonials, links it for review, and publishes anyway', () => {
    pages = [
      page('p-home', 'Home', [testimonials('s-home', 3)]),
      page('p-about', 'About', [testimonials('s-about', 1, 2)]),
      page('p-faqs', 'FAQs', [testimonials('s-real', 0, 2)]),
    ];
    wrap(<WebsitePublishBar academyId="a1" status="draft" />);
    fireEvent.click(screen.getByTestId('website-publish-toggle'));

    // The dedicated warning, not the ordinary confirmation.
    expect(confirm).not.toHaveBeenCalled();
    const dialog = screen.getByTestId('publish-sample-warning');
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Home');
    expect(rows[0].textContent).toContain('3 sample testimonials');
    expect(rows[1].textContent).toContain('1 sample testimonial');
    expect(
      within(rows[0])
        .getByRole('link', { name: 'Review the sample testimonials on Home' })
        .getAttribute('href')
    ).toBe('/dashboard/academy/a1/website/pages/p-home?section=s-home');

    expect(publishMutate).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Publish anyway' })
    );
    expect(publishMutate).toHaveBeenCalledWith('a1');
  });

  it('cancelling the warning publishes nothing', () => {
    pages = [page('p-home', 'Home', [testimonials('s-home', 1)])];
    wrap(<WebsitePublishBar academyId="a1" status="draft" />);
    fireEvent.click(screen.getByTestId('website-publish-toggle'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('publish-sample-warning')).toBeNull();
    expect(publishMutate).not.toHaveBeenCalled();
  });

  it('without samples, publishing keeps the ordinary confirmation', async () => {
    pages = [page('p-home', 'Home', [testimonials('s-real', 0, 2)])];
    confirm.mockResolvedValue(true);
    wrap(<WebsitePublishBar academyId="a1" status="draft" />);
    fireEvent.click(screen.getByTestId('website-publish-toggle'));
    await vi.waitFor(() => expect(publishMutate).toHaveBeenCalledWith('a1'));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ titleKey: 'website:publish.confirmTitle' })
    );
    expect(screen.queryByTestId('publish-sample-warning')).toBeNull();
  });
});

describe('launch checklist', () => {
  const configuration = (fields: Partial<WebsiteConfiguration>) =>
    ({
      status: 'draft',
      brand: { primaryColor: '217 83% 51%' },
      ...fields,
    }) as unknown as WebsiteConfiguration;

  const step = (id: string) =>
    document.querySelector<HTMLElement>(`[data-step="${id}"]`)!;

  it('a fresh starter website: nothing done yet, samples listed with review links', () => {
    wrap(
      <WebsiteLaunchChecklist
        academyId="a1"
        configuration={configuration({})}
        pages={[page('p-home', 'Home', [testimonials('s-home', 3)])]}
      />
    );
    expect(screen.getByText('0 of 3 done')).toBeTruthy();
    // The copy counts testimonials, not sections.
    expect(
      screen.getByText(/Your starter website has sample testimonials\./)
    ).toBeTruthy();
    expect(step('brand').dataset.done).toBe('false');
    expect(
      within(step('brand'))
        .getByRole('link', { name: 'Open Visual Identity' })
        .getAttribute('href')
    ).toBe('/dashboard/academy/a1/branding');
    expect(step('samples').dataset.done).toBe('false');
    expect(within(step('samples')).getByRole('link').getAttribute('href')).toBe(
      '/dashboard/academy/a1/website/pages/p-home?section=s-home'
    );
    expect(step('publish').dataset.done).toBe('false');
  });

  it('a launched website: every step done, from saved state', () => {
    wrap(
      <WebsiteLaunchChecklist
        academyId="a1"
        configuration={configuration({
          status: 'published',
          brand: {
            primaryColor: '217 83% 51%',
            palette: {
              schemaVersion: 1,
              algorithmVersion: 'bp-1',
              status: 'confirmed',
              source: 'logo',
              seeds: { primary: '217 83% 51%' },
              roles: Object.fromEntries(
                BRAND_ROLE_NAMES.map((name) => [name, '217 83% 51%'])
              ),
            },
          } as never,
        })}
        pages={[page('p-home', 'Home', [testimonials('s-real', 0, 2)])]}
      />
    );
    expect(screen.getByText('3 of 3 done')).toBeTruthy();
    for (const id of ['brand', 'samples', 'publish']) {
      expect(step(id).dataset.done).toBe('true');
    }
    expect(screen.queryByRole('link')).toBeNull();
  });
});
