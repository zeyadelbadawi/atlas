/**
 * D5-3 — the academy currency is the default for a NEW course price; a
 * price that already has a currency keeps it (no conversion, no rewrite).
 *
 * Only EGP is supported today, where the academy default and the platform
 * default are the same value. To make the academy's currency observable
 * these tests widen the allow-list to EGP + SAR and give the academy SAR —
 * a simulation of the day SAR opens, NOT today's configuration.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import type { Academy, Course } from '@types';
import { academyService } from '@/features/academy/services/AcademyService';
import { courseService } from './services/CourseService';
import { CourseCreateForm } from './components/CourseCreateForm';
import { PricingStep } from './wizard/PricingStep';

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    organization: { id: 'org-1' },
    switchOrganization: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));
vi.mock('@/shared/utils/currency.utils', async (importOriginal) => {
  const allowed = ['EGP', 'SAR'];
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    SUPPORTED_CURRENCIES: allowed,
    currencyOptions: (current?: string | null) =>
      current && !allowed.includes(current) ? [...allowed, current] : allowed,
    defaultPriceCurrency: (academyCurrency?: string | null) =>
      academyCurrency && allowed.includes(academyCurrency)
        ? academyCurrency
        : 'EGP',
  };
});

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const ACADEMY = {
  id: 'aca-1',
  organizationId: 'org-1',
  currency: 'SAR',
} as unknown as Academy;

const COURSE: Course = {
  id: 'c1',
  academyId: 'aca-1',
  title: 'Arabic 101',
  slug: 'arabic-101',
  status: 'draft',
  visibility: 'private',
  pricing: { type: 'free' },
  instructors: [],
  stats: { totalSections: 0, totalLessons: 0 },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

let getAcademy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getAcademy = vi.fn(async () => ACADEMY);
  vi.spyOn(academyService, 'getAcademy').mockImplementation(
    getAcademy as unknown as typeof academyService.getAcademy
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithProviders(element: JSX.Element) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <AtlasDialogProvider>
            <UnsavedChangesProvider>
              <MemoryRouter>{element}</MemoryRouter>
            </UnsavedChangesProvider>
          </AtlasDialogProvider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return userEvent.setup();
}

async function choosePaid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: /pricing/i }));
  await user.click(await screen.findByRole('option', { name: 'Paid' }));
}

const currencyShown = () =>
  screen.getByRole('combobox', { name: 'Currency' }).textContent ?? '';

describe('course price currency default (D5-3)', { timeout: 20_000 }, () => {
  it("a new course's price starts in the academy currency", async () => {
    const createCourse = vi
      .spyOn(courseService, 'createCourse')
      .mockResolvedValue({ ...COURSE, id: 'c9' });
    vi.spyOn(courseService, 'getCourseCategories').mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
    } as unknown as Awaited<
      ReturnType<typeof courseService.getCourseCategories>
    >);
    const user = renderWithProviders(
      <CourseCreateForm academyId="aca-1" onCreated={vi.fn()} />
    );
    await waitFor(() => expect(getAcademy).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Course Title'), 'Tajweed');
    await choosePaid(user);
    await waitFor(() => expect(currencyShown()).toContain('SAR'));
    await user.type(screen.getByLabelText('Price'), '150');
    await user.click(screen.getByRole('button', { name: 'Create Course' }));

    await waitFor(() => expect(createCourse).toHaveBeenCalledTimes(1));
    expect(createCourse.mock.calls[0][1].pricing).toEqual({
      type: 'paid',
      amount: 150,
      currency: 'SAR',
    });
  });

  it('a free course turning paid takes the academy currency', async () => {
    const updateCourse = vi
      .spyOn(courseService, 'updateCourse')
      .mockImplementation(
        async (_a, _c, payload) => ({ ...COURSE, ...payload }) as Course
      );
    const onNext = vi.fn();
    const user = renderWithProviders(
      <PricingStep
        academyId="aca-1"
        course={COURSE}
        onNext={onNext}
        goToStep={vi.fn()}
      />
    );
    await waitFor(() => expect(getAcademy).toHaveBeenCalled());
    await choosePaid(user);
    await waitFor(() => expect(currencyShown()).toContain('SAR'));
    await user.type(screen.getByLabelText('Price'), '80');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));

    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(1));
    expect(updateCourse.mock.calls[0][2].pricing).toEqual({
      type: 'paid',
      amount: 80,
      currency: 'SAR',
    });
  });

  it('a price that already has a currency keeps it', async () => {
    const updateCourse = vi
      .spyOn(courseService, 'updateCourse')
      .mockImplementation(
        async (_a, _c, payload) => ({ ...COURSE, ...payload }) as Course
      );
    const priced: Course = {
      ...COURSE,
      pricing: { type: 'paid', amount: 200, currency: 'EGP' },
    };
    const user = renderWithProviders(
      <PricingStep
        academyId="aca-1"
        course={priced}
        onNext={vi.fn()}
        goToStep={vi.fn()}
      />
    );
    await waitFor(() => expect(getAcademy).toHaveBeenCalled());
    // Give the academy (SAR) time to arrive; the course's EGP must stay.
    await screen.findByRole('combobox', { name: 'Currency' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(currencyShown()).toContain('EGP');

    const price = screen.getByLabelText('Price');
    await user.clear(price);
    await user.type(price, '250');
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(1));
    expect(updateCourse.mock.calls[0][2].pricing).toEqual({
      type: 'paid',
      amount: 250,
      currency: 'EGP',
    });
  });
});
